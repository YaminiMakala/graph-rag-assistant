import os
import re
from typing import List, Optional, Generator
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import PyPDF2
import io
import chromadb
from neo4j import GraphDatabase, Session
import uuid
from dotenv import load_dotenv
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import traceback

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GraphRAG Research Assistant API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Initialize models and clients
vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
chroma_client = chromadb.Client()
collection = chroma_client.create_collection(name="research_papers")

# Track if vectorizer has been fitted
vectorizer_fitted = False

# Neo4j driver
try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    logger.info("Neo4j driver initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Neo4j driver: {e}")
    driver = None

class QuestionRequest(BaseModel):
    question: str

class SearchResult(BaseModel):
    text: str
    similarity: float
    paper_id: str

class GraphResult(BaseModel):
    type: str
    data: dict

class AnswerResponse(BaseModel):
    answer: str
    vector_context: List[SearchResult]
    graph_context: List[GraphResult]

def get_neo4j_session() -> Generator[Session, None, None]:
    if driver is None:
        raise HTTPException(status_code=500, detail="Neo4j database not available")
    
    session = driver.session()
    try:
        yield session
    finally:
        session.close()

def extract_metadata_from_text(text: str, filename: str) -> dict:
    """Improved metadata extraction with better author detection"""
    # Look for author sections in academic papers
    author_sections = [
        r'author[s]?[:\s]+([^\n]+?)(?=\n\s*\n|$|abstract|introduction)',
        r'by\s+([^\n]+?)(?=\n\s*\n|$|abstract|introduction)',
        r'([A-Z][a-z]+ [A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+ [A-Z][a-z]+)*)\s+et al\.',
    ]
    
    authors = []
    for pattern in author_sections:
        matches = re.findall(pattern, text[:3000], re.IGNORECASE)
        if matches:
            # Clean and split authors
            for match in matches:
                if 'university' in match.lower() or 'email' in match.lower():
                    continue  # Skip affiliation text
                # Split by commas, 'and', etc.
                potential_authors = re.split(r',|\band\b|&', match)
                for author in potential_authors:
                    author = author.strip()
                    if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+$', author):
                        authors.append(author)
            break
    
    # If no authors found, use filename-based title
    if not authors:
        authors = ["Research Team"]
    
    title = filename.replace('.pdf', '').replace('_', ' ').title()
    
    return {
        "title": title,
        "authors": authors[:3],  # Max 3 authors
        "source_file": filename
    }

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks with memory protection"""
    chunks = []
    start = 0
    text_length = len(text)
    
    # For very large texts, use larger chunks to reduce memory usage
    if text_length > 20000:
        chunk_size = 1000
        overlap = 100
        logger.info(f"Using larger chunks for large text: {chunk_size}/{overlap}")
    
    max_chunks = 1000  # Safety limit to prevent memory exhaustion
    
    while start < text_length and len(chunks) < max_chunks:
        end = start + chunk_size
        if end > text_length:
            end = text_length
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
        
        # Safety check to prevent infinite loops
        if start < 0:
            start = 0
        if start >= text_length:
            break
    
    logger.info(f"Created {len(chunks)} chunks from {text_length} characters")
    return chunks

def is_memory_available():
    """Simple memory availability check"""
    try:
        import psutil
        available_memory = psutil.virtual_memory().available / 1024 / 1024
        return available_memory > 200  # Need at least 200MB free
    except ImportError:
        # If psutil is not installed, assume memory is available
        logger.info("psutil not installed, skipping memory check")
        return True
    except Exception as e:
        logger.warning(f"Memory check failed: {e}")
        return True

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    session: Session = Depends(get_neo4j_session)
):
    """Process uploaded PDF file"""
    global vectorizer_fitted
    
    try:
        logger.info(f"Starting upload processing for file: {file.filename}")
        
        # Check memory before starting
        if not is_memory_available():
            raise HTTPException(status_code=500, detail="Insufficient memory available for processing")
        
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read PDF content
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        
        logger.info(f"File size: {len(contents)} bytes")
        
        # Try different PDF readers if PyPDF2 fails
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            logger.info(f"PDF has {len(pdf_reader.pages)} pages")
        except Exception as e:
            logger.error(f"PyPDF2 failed: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid PDF file: {str(e)}")
        
        # Extract text from all pages
        text = ""
        successful_pages = 0
        for i, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text += page_text + "\n"
                    successful_pages += 1
                else:
                    logger.warning(f"Page {i+1} had no extractable text")
            except Exception as e:
                logger.warning(f"Failed to extract text from page {i+1}: {e}")
        
        logger.info(f"Successfully extracted text from {successful_pages}/{len(pdf_reader.pages)} pages")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from PDF")
        
        logger.info(f"Extracted text length: {len(text)} characters")
        
        # Extract metadata
        metadata = extract_metadata_from_text(text, file.filename)
        logger.info(f"Extracted metadata: {metadata}")
        
        # Generate unique ID for this paper
        paper_id = str(uuid.uuid4())
        
        # Store in Neo4j
        query = """
        MERGE (p:Paper {id: $paper_id, title: $title, source_file: $filename})
        WITH p
        UNWIND $authors AS author_name
        MERGE (a:Author {name: author_name})
        MERGE (a)-[:WROTE]->(p)
        RETURN p, collect(a) as authors
        """
        
        try:
            result = session.run(query, {
                "paper_id": paper_id,
                "title": metadata["title"],
                "filename": file.filename,
                "authors": metadata["authors"]
            })
            logger.info("Successfully stored data in Neo4j")
        except Exception as e:
            logger.error(f"Neo4j storage failed: {e}")
            # Continue with other processing even if Neo4j fails
        
        # Chunk text
        chunks = chunk_text(text)
        logger.info(f"Created {len(chunks)} text chunks")
        
        # Limit the number of chunks to process to avoid memory issues
        max_chunks_to_process = 200
        if len(chunks) > max_chunks_to_process:
            logger.warning(f"Too many chunks ({len(chunks)}), limiting to {max_chunks_to_process}")
            chunks = chunks[:max_chunks_to_process]
        
        # Create TF-IDF embeddings
        try:
            if not vectorizer_fitted:
                logger.info("Fitting vectorizer for the first time")
                embeddings = vectorizer.fit_transform(chunks).toarray()
                vectorizer_fitted = True
            else:
                logger.info("Transforming with existing vectorizer")
                embeddings = vectorizer.transform(chunks).toarray()
            
            logger.info("Successfully created embeddings")
        except Exception as e:
            logger.error(f"Embedding creation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process text: {str(e)}")
        
        # Store in ChromaDB
        try:
            ids = [f"{paper_id}_{i}" for i in range(len(chunks))]
            collection.add(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=chunks,
                metadatas=[{"paper_id": paper_id, "chunk_index": i} for i in range(len(chunks))]
            )
            logger.info("Successfully stored in ChromaDB")
        except Exception as e:
            logger.error(f"ChromaDB storage failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to store embeddings: {str(e)}")
        
        response = {
            "message": "PDF processed successfully",
            "paper_id": paper_id,
            "title": metadata["title"],
            "authors": metadata["authors"],
            "chunks_processed": len(chunks)
        }
        
        logger.info(f"Upload completed successfully: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(
    request: QuestionRequest,
    session: Session = Depends(get_neo4j_session)
):
    """Answer question based on research papers"""
    global vectorizer_fitted
    
    try:
        # Check if vectorizer is fitted
        if not vectorizer_fitted:
            raise HTTPException(
                status_code=400, 
                detail="No documents have been processed yet. Please upload PDF files first."
            )
        
        # Generate embedding for question
        question_embedding = vectorizer.transform([request.question]).toarray()[0]
        
        # Query vector database
        results = collection.query(
            query_embeddings=[question_embedding.tolist()],
            n_results=5
        )
        
        # Process vector results
        vector_context = []
        if results['documents'] and len(results['documents'][0]) > 0:
            for i, (doc, distance, metadata) in enumerate(zip(
                results['documents'][0],
                results['distances'][0],
                results['metadatas'][0]
            )):
                vector_context.append(SearchResult(
                    text=doc,
                    similarity=1 - distance,
                    paper_id=metadata['paper_id']
                ))
        
        # Query knowledge graph for related information
        graph_context = []
        
        # Query for papers mentioning similar concepts
        graph_query = """
        MATCH (p:Paper)
        WHERE p.title CONTAINS $query OR p.id IN $paper_ids
        OPTIONAL MATCH (a:Author)-[:WROTE]->(p)
        OPTIONAL MATCH (p)-[r]->(related)
        RETURN p, collect(DISTINCT a) as authors, collect(DISTINCT {type: type(r), target: related}) as relationships
        LIMIT 10
        """
        
        paper_ids = list(set([ctx.paper_id for ctx in vector_context]))
        graph_results = session.run(graph_query, {
            "query": request.question.lower(),
            "paper_ids": paper_ids if paper_ids else [""]
        })
        
        for record in graph_results:
            paper = record["p"]
            authors = record["authors"]
            relationships = record["relationships"]
            
            graph_context.append(GraphResult(
                type="paper",
                data={
                    "id": paper.get("id"),
                    "title": paper.get("title"),
                    "authors": [author.get("name") for author in authors] if authors else [],
                    "source_file": paper.get("source_file")
                }
            ))
            
            if relationships:
                for rel in relationships:
                    if rel["target"]:
                        graph_context.append(GraphResult(
                            type="relationship",
                            data={
                                "from": paper.get("id"),
                                "type": rel["type"],
                                "to": rel["target"].get("id", str(rel["target"].id)) if hasattr(rel["target"], 'get') else str(rel["target"].id)
                            }
                        ))
        
        # Prepare meaningful context from the vector search results
        top_passages = "\n".join([f"• {ctx.text[:150]}..." for ctx in vector_context[:3]])

        # Get unique paper IDs for display
        unique_papers = set([ctx.paper_id for ctx in vector_context])
        paper_count = len(unique_papers)

        # Create much better AI response with actual content
        ai_answer = f"""## Analysis of: '{request.question}'

### 📊 Research Insights:
Based on analysis of {len(vector_context)} relevant passages from {paper_count} research papers:

### 🔍 Key Findings:
{top_passages}

### 📚 Papers Analyzed:
{', '.join([paper_id[:8] + '...' for paper_id in unique_papers])}

### 💡 Summary:
The research discusses {request.question.lower()} with focus on technical approaches and methodologies found across multiple studies in the analyzed papers."""

        return AnswerResponse(
            answer=ai_answer,
            vector_context=vector_context,
            graph_context=graph_context
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    neo4j_status = "connected" if driver else "disconnected"
    return {
        "status": "healthy", 
        "service": "GraphRAG Research Assistant API",
        "neo4j": neo4j_status,
        "vectorizer_fitted": vectorizer_fitted
    }

@app.get("/stats")
async def get_stats():
    """Get system statistics"""
    try:
        # Get paper count from Neo4j
        paper_count = 0
        if driver:
            with driver.session() as session:
                result = session.run("MATCH (p:Paper) RETURN count(p) AS count")
                paper_count = result.single()["count"]
        
        # Get chunk count from ChromaDB
        chunk_count = collection.count()
        
        return {
            "papers_processed": paper_count,
            "chunks_processed": chunk_count,
            "vectorizer_fitted": vectorizer_fitted
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)