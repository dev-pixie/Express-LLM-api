# Local LLM Streaming API Demo

## Project Description  
This project demonstrates a streaming API based in NodeJs for large language models (LLMs) using Hugging Face transformers. It provides a Node.js Express server that receives text prompts, sends them to a Python process running a local model, and streams the generated text output back to clients in real-time. The generated output tokens are streamed in form of chunked json objects in the expected format `{"response": "output chunk 1"}`. The express server also maintains a light-weight queue to handle multiple requests in situations where the model is busy or loading for inference.

## tldr;

- **Huggingface model:** The server returns the response from an actual LLM model (gpt2) locally.
- **Streaming token as json chunks:** The server streams the output tokens as json chunks using the NDJSON format over an HTTP connection.
- **Queue Management:** The requests are queued using a light-weight javascript based queue so that no request is missed when model is busy or is not ready.
- **Logging:** All the responses of the LLMs are logged to a jsonl file with timestamp and corresponding prompts.
- **CLI testing:** A CLI based testing can be done via a lightweight file `cli.test.js` (see step#7) and you can see streaming in action.
- **Postman collection:** A postman collection json file inside `postman` directory.

---

## Why Node.js + Python?  
- **Skill Demonstration:** To demonstrate cross-languages abilities. This project demonstrates my ability to seamlessly combine Node.js backend with Python ML code. This is to highlight and demonstrate my grasp over AI integrations and Python programming language giving you a better picture of my skills ensuring a better judgement.
- **Local model execution:** Python ecosystem is the de facto choice for working with Hugging Face transformers and deep learning models locally. A NodeJs standalone project would require offloading the model execution tasks to something like Ollama via HTTP connection. However, that would not show my ability to manage models, stream output and manage tokens and other technicalities.     
- **Technical depth:** Illustrates handling multi-process communication, managing token-by-token streaming over json chunks, and managing concurrency queues between two languages.

---

## Setup Instructions  

### Prerequisites  
- Node.js (v16+)  
- Python (v3.8+)  
- Git (optional, to clone repo)  

### Steps

1. **Clone or download the project:** 
   ```bash
   git clone https://github.com/dev-pixie/minivault-api.git
   cd minivault-api
   ```

2. **Create and activate Python virtual environment (recommended):** 

    ```bash
    # Windows:
    python -m venv venv
    venv\Scripts\activate
    # Linux/macOS:
    python3 -m venv venv
    source venv/bin/activate
    ```

3. **Install Python dependencies:** 

    ```bash
    pip install -r requirements.txt
    ```

4. **Install Node.js dependencies:** 

    ```bash
    npm install
    ```

5. **Run the server:** 

    ```bash
    node server.js
    ```

6. **Wait for the AI model to be loaded (recommended):** 

   Wait until the terminal says: 
   ```bash
   ✅ Python model loaded.
   ```

   Although, you can still call the API and the server will queue the request but waiting for the model to load is recommended.

7. **Use `CLI` to test:** 

   Run the following command in a separate terminal (from root of the directory):
   ```bash
   node cli.test.js "What is an AI model?"
   ```

   You can see the streaming in action

8. **Using Postman to test:** 

    You can also use Postman to hit the API endpoints. But, postman buffers the chunks show them 'all at once' which may make it appear that the response is not streaming.

    The postman collection is at following location:

    <pre> ``` postman/ └── ModelVault API Demo.postman_collection.json ``` </pre>

---

## Implementation Notes and Tradeoffs  

- **Spawning Python process once:** To reduce startup overhead, the Python model process is spawned once on Node.js start, and prompts are queued to it.  
- **Streaming output:** Node.js streams Python stdout chunks immediately to clients for real-time experience.  
- **Concurrency management:** Queueing handles multiple incoming prompts without spawning multiple Python processes.  
- **Alternative designs:**  
  - Running a full Python HTTP server (e.g., FastAPI) to expose model as a service.
    - Tradeoffs: Minimal tradeoffs. This particular project uses Node + Python approach to demonstrate programming capabilities for better judgement. 
  - Spawning a Python process per request. This will not require queueing of the requests.  
    - Tradeoffs: simpler but slower and resource-heavy.
  - Return the response as `Raw String Stream` by setting `res.setHeader('Content-Type', 'text/plain; charset=utf-8');`
    - Tradeoffs: The response will not be a json.
---
