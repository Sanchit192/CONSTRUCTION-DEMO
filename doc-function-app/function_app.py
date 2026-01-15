from datetime import datetime
import io
import azure.functions as func
import json
import logging
import os
import pdfplumber
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, ContentSettings
from openai import AzureOpenAI
from azure.storage.blob import BlobClient


# ---------------- Load .env ----------------
load_dotenv()
# ---------------- Logging ----------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


AZURE_OPENAI_ENDPOINT = os.getenv("ENDPOINT_URL")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
DEPLOYMENT_NAME = os.getenv("DEPLOYMENT_NAME", "gpt-4.1")

SEARCH_ENDPOINT = os.getenv("SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("SEARCH_KEY")
SEARCH_INDEX = os.getenv("SEARCH_INDEX_NAME")

client = AzureOpenAI(
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_KEY,
    api_version="2025-01-01-preview",
)


# ---------------- Function App ----------------
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)



@app.route(
    route="projects/{projectName}/upload",
    methods=["POST"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def upload_project_file(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Blob upload triggered")

    try:
        project_name = req.route_params.get("projectName")
        file = req.files.get("file")

        if not project_name or not file:
            return func.HttpResponse(
                json.dumps({"error": "projectName and file are required"}),
                status_code=400,
                mimetype="application/json"
            )

        # Sanitize project name
        project_name = project_name.replace("..", "").replace("/", "_")

        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        blob_path = f"{project_name}/{file.filename}"

        blob_client = container_client.get_blob_client(blob_path)

        blob_client.upload_blob(
            file.stream.read(),
            overwrite=True,
            content_settings=ContentSettings(
                content_type=file.content_type
            )
        )

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "project": project_name,
                "file": file.filename,
                "path": blob_path
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Blob upload failed")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(
    route="projects",
    methods=["GET"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def list_projects(req: func.HttpRequest) -> func.HttpResponse:
    try:
        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        projects = set()
        for blob in container_client.list_blobs():
            projects.add(blob.name.split("/")[0])

        return func.HttpResponse(
            json.dumps(sorted(projects)),
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Failed to list projects")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


@app.route(
    route="projects/{projectName}/files",
    methods=["GET"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def list_project_files(req: func.HttpRequest) -> func.HttpResponse:
    try:
        project_name = req.route_params.get("projectName")

        if not project_name:
            return func.HttpResponse(
                json.dumps({"error": "projectName required"}),
                status_code=400,
                mimetype="application/json"
            )

        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        files = []
        prefix = f"{project_name}/"

        for blob in container_client.list_blobs(name_starts_with=prefix):
            files.append(blob.name.replace(prefix, ""))

        return func.HttpResponse(
            json.dumps(files),
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Failed to list project files")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
    

@app.route(
    route="projects/daily-reports/{projectName}/upload",
    methods=["POST"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def upload_daily_report(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Daily report upload triggered")

    try:
        project_name = req.route_params.get("projectName")
        file = req.files.get("file")

        if not project_name or not file:
            return func.HttpResponse(
                json.dumps({"error": "projectName and file are required"}),
                status_code=400,
                mimetype="application/json"
            )

        # Sanitize project name
        project_name = project_name.replace("..", "").replace("/", "_")

        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        # Upload to subfolder daily-reports
        blob_path = f"daily-reports/{project_name}/{file.filename}"

        blob_client = container_client.get_blob_client(blob_path)

        blob_client.upload_blob(
            file.stream.read(),
            overwrite=True,
            content_settings=ContentSettings(
                content_type=file.content_type
            )
        )

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "project": project_name,
                "file": file.filename,
                "path": blob_path
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Daily report upload failed")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
def read_pdf_from_blob(project:str,blob_name: str) -> str:
    blob_service = BlobServiceClient.from_connection_string(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
    full_blob_path = f"{project}/{blob_name}"
    blob_client = blob_service.get_blob_client(container=os.getenv("BLOB_CONTAINER_NAME"), blob=full_blob_path)
    logging.info(blob_name)
    
    stream = io.BytesIO()
    blob_client.download_blob().readinto(stream)
    
    text = ""
    with pdfplumber.open(stream) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

@app.route(route="contracts/compare", methods=["POST"])
def compare_reports(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Daily-reports comparison triggered")

    try:
        body = req.get_json()

        project = body.get("projectName")
        files = body.get("files", [])

        if not project or len(files) < 2:
            return func.HttpResponse(
                json.dumps({"error": "Project and at least 2 files required"}),
                status_code=400,
                mimetype="application/json"
            )

        file_1, file_2 = files[0], files[1]

        logging.info(
            f"Comparing files | Project={project} | File1={file_1} | File2={file_2}"
        )
        file_1_text = read_pdf_from_blob(project, file_1)
        file_2_text = read_pdf_from_blob(project, file_2)

        # --- Prompt Engineering ---
        prompt = f"""
You are a senior construction contract analyst with expertise in interior construction projects.

Project: {project}

Compare the following contracts in a concise, executive-friendly format. For each point, include a citation referring to the section or line in the provided PDF from which the summary is taken.

Instructions:
1. Start with a **Final Recommendation**: which contract is preferable and why.
2. Immediately follow with **Reasons** (bullet points, concise).
3. Present **Key Differences** in a **table format** using the actual file names as headers:
   | Aspect       | {file_1} | {file_2} |
   |-------------|-----------|-----------|
4. Cover the following aspects in the table: Scope, Commercials, Timelines, Risks.
5. For each bullet point or table entry, reference the PDF section, e.g., "Scope of Work – Section 1" or "Weekly Execution Timeline – Section 3".
6. Avoid long paragraphs—use bullet points and tables for clarity.
7. Always reference the actual file names in all sections.

Contract 1: {file_1}
Content:
{file_1_text}

Contract 2: {file_2}
Content:
{file_2_text}
"""

        completion = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You compare construction contracts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        comparison_text = completion.choices[0].message.content

        logging.info("Comparison generated successfully")

        return func.HttpResponse(
            json.dumps({
                "comparison": comparison_text
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Comparison failed")

        return func.HttpResponse(
            json.dumps({
                "error": str(e)
            }),
            status_code=500,
            mimetype="application/json"
        )
    
def read_pdf_from_blob_path(blob_path: str) -> str:
    blob_service = BlobServiceClient.from_connection_string(
        os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    )

    container_name = os.getenv("BLOB_CONTAINER_NAME")
    blob_client = blob_service.get_blob_client(
        container=container_name,
        blob=blob_path
    )

    stream = io.BytesIO()
    blob_client.download_blob().readinto(stream)
    stream.seek(0)

    text = ""
    with pdfplumber.open(stream) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    return text


@app.route(route="daily-reports/anomaly-detect", methods=["POST"])
def detect_daily_report_anomalies(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Daily report anomaly detection triggered")

    try:
        body = req.get_json()

        project = body.get("projectName")
        files = body.get("files", [])

        # Expected:
        # files[0] -> daily report filename
        # files[1] -> final sow filename

        daily_report_file = files[0]
        final_sow_file = files[1]

        daily_report_blob_path = f"daily-reports/{project}/{daily_report_file}"
        final_sow_blob_path = f"{project}/{final_sow_file}"

        daily_report_text = read_pdf_from_blob_path(daily_report_blob_path)
        final_sow_text = read_pdf_from_blob(project,final_sow_file)

        # ---------- 🔥 NEW PROMPT (ANOMALY DETECTION) ----------
        prompt = f"""
You are a senior construction controls and contract compliance analyst.

Project: {project}

TASK:
The FINAL SOW is the source of truth.
The DAILY REPORT must strictly comply with the FINAL SOW.

Your job is to detect and report ONLY deviations, anomalies, or mismatches found in the Daily Report
when compared against the Final SOW.

DO NOT summarize.
DO NOT restate matching content.
ONLY report differences.

ANALYZE FOR:
- Scope deviations
- Extra or missing work
- Quantity or area mismatches
- Timeline or milestone changes
- Method or material changes
- Any statement that can cause cost, delay, or claim risk

FORMAT YOUR OUTPUT EXACTLY LIKE THIS:

For each anomaly, use ONE bullet in the format:
• Section | Final SOW | Daily Report | Impact (Low / Medium / High)

RULES:
- Be precise and factual
- No long paragraphs
- No assumptions beyond the documents
- If no anomalies are found, respond with:
  "No deviations detected. Daily report aligns with the Final SOW."

FINAL SOW (Baseline Document): {final_sow_file}
Content:
{final_sow_text}

DAILY REPORT (To Validate): {daily_report_file}
Content:
{daily_report_text}
"""

        completion = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You detect construction compliance anomalies."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )

        anomaly_report = completion.choices[0].message.content
        logging.info(completion.choices[0].message.content)

        logging.info("Anomaly detection completed successfully")

        return func.HttpResponse(
            json.dumps({
                "anomalies": anomaly_report
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Anomaly detection failed")

        return func.HttpResponse(
            json.dumps({
                "error": str(e)
            }),
            status_code=500,
            mimetype="application/json"
        )


@app.route(route="document-chat", methods=["POST"])
def document_chat(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Document chat triggered")

    try:
        body = req.get_json()

        project = body.get("projectName")
        file_name = body.get("fileName")
        question = body.get("question")

        if not file_name or not question:
            return func.HttpResponse(
                json.dumps({"error": "Both 'fileName' and 'question' are required."}),
                status_code=400,
                mimetype="application/json"
            )

        # Read the PDF content from blob
        blob_path = f"{project}/{file_name}"
        file_text = read_pdf_from_blob(project, file_name)

        # ---------- 🔥 NEW PROMPT (CHAT BASED ON DOCUMENT) ----------
        prompt = f"""
You are a senior construction project assistant with expert knowledge in reading and analyzing construction project documents. 

Project: {project}

TASK:
Answer the user's question based ONLY on the content of the provided document.
Do NOT provide any information that is not in the document.
If the question requires analysis or recommendations (e.g., vendor selection), base your reasoning strictly on the document content.

DOCUMENT: {file_name}
Content:
{file_text}

USER QUESTION:
{question}

RESPONSE REQUIREMENTS:
- Be precise, factual, and detailed.
- Summarize content when asked for a summary.
- If asked for recommendations (e.g., which vendor to choose), provide reasoning strictly based on the document's information.
- Keep your answer concise but comprehensive.
- If the answer is not in the document, respond with:
  "The document does not contain information to answer this question."
"""

        # Call the OpenAI chat model
        completion = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You answer user questions based on provided documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )

        answer = completion.choices[0].message.content
        logging.info(f"Document chat response: {answer}")

        return func.HttpResponse(
            json.dumps({"answer": answer}),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Document chat failed")

        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
    

@app.route(
    route="projects/{projectName}/files",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def delete_file(req: func.HttpRequest) -> func.HttpResponse:
    try:
        project_name = req.route_params.get("projectName")
        file_name = req.params.get("fileName")

        if not project_name or not file_name:
            return func.HttpResponse(
                json.dumps({"error": "projectName and fileName required"}),
                status_code=400,
                mimetype="application/json"
            )

        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        blob_path = f"{project_name}/{file_name}"
        blob_client = container_client.get_blob_client(blob_path)

        blob_client.delete_blob()

        return func.HttpResponse(
            json.dumps({"message": f"{file_name} deleted successfully"}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Failed to delete file")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
