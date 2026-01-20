from datetime import datetime
import io
import math
import re
import azure.functions as func
import json
import logging
import os
import pdfplumber
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, ContentSettings
from openai import AzureOpenAI
from azure.storage.blob import BlobClient
from openpyxl import Workbook, load_workbook
from datetime import datetime, timedelta ,date


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
    

def append_to_final_report(project: str, entry_type: str, payload: dict):
    excel_path = f"daily-reports/{project}/final-report.xlsx"
    blob_client = get_blob_client(excel_path)

    output = io.BytesIO()

    try:
        existing = io.BytesIO()
        blob_client.download_blob().readinto(existing)
        existing.seek(0)
        wb = load_workbook(existing)
        ws = wb.active
    except Exception:
        wb = Workbook()
        ws = wb.active
        ws.title = "logs"
        ws.append(["date", "type", "data"])

    ws.append([
        datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        entry_type,
        json.dumps(payload)
    ])

    wb.save(output)
    output.seek(0)

    blob_client.upload_blob(
        output,
        overwrite=True,
        content_settings=ContentSettings(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
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

        project_name = project_name.replace("..", "").replace("/", "_")

        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("BLOB_CONTAINER_NAME")

        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service.get_container_client(container_name)

        blob_path = f"daily-reports/{project_name}/{file.filename}"
        blob_client = container_client.get_blob_client(blob_path)

        # 1️⃣ Upload PDF
        blob_client.upload_blob(
            file.stream.read(),
            overwrite=True,
            content_settings=ContentSettings(
                content_type=file.content_type
            )
        )

        # 2️⃣ Extract PDF text
        extracted_text = read_pdf_from_blob_path(blob_path)

        # 3️⃣ Prepare payload
        payload = {
            "project": project_name,
            "fileName": file.filename,
            "uploadedAt": datetime.utcnow().isoformat(),
            "type": "daily_report",
            "content": extracted_text
        }

        # 4️⃣ Append to final-report.xlsx
        append_to_final_report(
            project=project_name,
            entry_type="daily_report",
            payload=payload
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


def calculate_reporting_week(start_date: str, report_date: str) -> int:
    start = datetime.strptime(start_date, "%Y-%m-%d")
    report = datetime.strptime(report_date, "%Y-%m-%d")

    delta_days = (report - start).days
    if delta_days < 0:
        return 1

    return math.floor(delta_days / 7) + 1

def extract_report_date(report_text: str) -> str | None:
    """
    Extracts date in formats like:
    14-Jan-2026, 14 Jan 2026, 2026-01-14
    """
    patterns = [
        r"\b\d{1,2}-[A-Za-z]{3}-\d{4}\b",
        r"\b\d{1,2}\s[A-Za-z]{3}\s\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, report_text)
        if match:
            raw = match.group(0)
            for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d"):
                try:
                    return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                except:
                    continue

    return None




@app.route(route="daily-reports/anomaly-detect", methods=["POST"])
def detect_daily_report_anomalies(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Daily report anomaly detection triggered")

    try:
        body = req.get_json()

        project = body.get("projectName")
        files = body.get("files", [])
        start_date = body["anomalyStartDate"]

        daily_report_file = files[0]
        final_sow_file = files[1]

        # ---------- READ DOCUMENTS ----------
        daily_report_text_full = read_pdf_from_blob_path(
            f"daily-reports/{project}/{daily_report_file}"
        )

        final_sow_text = read_pdf_from_blob(project, final_sow_file)

        # ---------- EXTRACT REPORT DATE ----------
        daily_report_date = extract_report_date(daily_report_text_full)

        if not daily_report_date:
            raise ValueError("Could not extract Daily Report date from document")

        # ---------- CALCULATE REPORTING WEEK ----------
        reporting_week = calculate_reporting_week(
            start_date=start_date,
            report_date=daily_report_date
        )

        daily_report_text = daily_report_text_full
        # ---------- 🔥 DYNAMIC PROMPT ----------
        prompt = f"""
You are a senior construction controls and contract compliance analyst.

Project: {project}

CONTEXT (AUTHORITATIVE):
- Project start date: {start_date}
- Daily report date: {daily_report_date}
- Calculated reporting week: Week {reporting_week}

STRICT EVALUATION RULES:
1. Only assess activities that were contractually scheduled
   to START or PROGRESS in Week {reporting_week} or earlier.
2. Any activity scheduled AFTER Week {reporting_week}:
   - MUST be Impact: Low
   - Use wording: "Not yet due as per contract timeline"
3. Medium or High impact is allowed ONLY if:
   - The activity was due by Week {reporting_week}
   - AND the Daily Report shows a clear deviation
4. Payment-related deviations:
   - Medium impact ONLY if the linked physical milestone
     was due by Week {reporting_week}
   - Otherwise Impact: Low

OUTPUT FORMAT (MANDATORY — UI DEPENDS ON THIS):
• Category | Expected | Observed | Impact: High / Medium / Low

STYLE RULES:
- One bullet per deviation
- Short, factual statements only
- No explanations
- No headings
- No extra text before or after bullets

FINAL SOW (Baseline):
{final_sow_text}

DAILY REPORT (Week {reporting_week}):
{daily_report_text}

If NO valid deviations exist, respond with EXACTLY:
No deviations detected for the current reporting period.
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

        return func.HttpResponse(
            json.dumps({
                "anomalies": anomaly_report,
                "reportingWeek": reporting_week,
                "reportDate": daily_report_date
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Anomaly detection failed")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
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
    

@app.route(
    route="projects/{projectName}/files/meta",
    methods=["GET"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def list_project_files_with_metadata(req: func.HttpRequest) -> func.HttpResponse:
    """Return a list of files in the given project with metadata (last_modified/upload date, size, content type, metadata)."""
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
        prefix = f"daily-reports/{project_name}/"
 
        for blob in container_client.list_blobs(name_starts_with=prefix):
            # blob.name is the full path in the container
            file_name = blob.name.replace(prefix, "")
            if not file_name:
                # skip directory-like blobs
                continue
 
            # last_modified is a timezone-aware datetime if present
            last_modified = None
            if getattr(blob, "last_modified", None):
                try:
                    last_modified = blob.last_modified.isoformat()
                except Exception:
                    last_modified = str(blob.last_modified)
 
            size = getattr(blob, "size", None)
 
            content_type = None
            if getattr(blob, "content_settings", None):
                content_type = getattr(blob.content_settings, "content_type", None)
 
            files.append({
                "name": file_name,
                "last_modified": last_modified,
                "content_type": content_type,
            })
 
        return func.HttpResponse(
            json.dumps(files),
            mimetype="application/json"
        )
 
    except Exception as e:
        logging.exception("Failed to list project files with metadata")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

def get_blob_client(blob_path: str):
    return BlobServiceClient.from_connection_string(
        os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    ).get_blob_client(
        container=os.getenv("BLOB_CONTAINER_NAME"),
        blob=blob_path
    )

@app.route(route="projects/{projectName}/finalize", methods=["POST"])
def finalize_document(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Finalize document triggered")

    project = req.route_params.get("projectName")
    body = req.get_json()

    # ✅ align with frontend
    file_name = body.get("finalFile")

    logging.info(f"Finalizing document | Project={project} | File={file_name}")

    if not project or not file_name:
        return func.HttpResponse(
            json.dumps({"error": "projectName and finalFile required"}),
            status_code=400,
            mimetype="application/json"
        )

    # 1️⃣ Read final PDF
    extracted_text = read_pdf_from_blob(project, file_name)

    payload = {
        "project": project,
        "fileName": file_name,
        "finalizedAt": datetime.utcnow().isoformat(),
        "content": extracted_text
    }

    excel_path = f"daily-reports/{project}/final-report.xlsx"
    blob_client = get_blob_client(excel_path)
    output = io.BytesIO()

    try:
        existing = io.BytesIO()
        blob_client.download_blob().readinto(existing)
        existing.seek(0)
        wb = load_workbook(existing)
        ws = wb.active
    except Exception:
        wb = Workbook()
        ws = wb.active
        ws.title = "final_logs"
        ws.append(["date", "type", "data"])

    ws.append([
        datetime.utcnow().strftime("%Y-%m-%d"),
        "final",
        json.dumps(payload)
    ])

    wb.save(output)
    output.seek(0)

    blob_client.upload_blob(
        output,
        overwrite=True,
        content_settings=ContentSettings(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    )

    return func.HttpResponse(
        json.dumps({
            "success": True,
            "excelPath": excel_path
        }),
        status_code=200,
        mimetype="application/json"
    )


def normalize_date(value):
    """
    Handles Excel datetime, date, and string formats safely
    """
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        # Handles both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS"
        return datetime.fromisoformat(value).date()

    raise ValueError(f"Unsupported date format: {value}")


@app.route(route="projects/{projectName}/progress-chart", methods=["GET"])
def generate_progress_chart(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Generating project progress chart")

    try:
        project_name = req.route_params.get("projectName")
        start_date_str = req.params.get("startDate")

        if not project_name:
            return func.HttpResponse(
                json.dumps({"error": "projectName is required"}),
                status_code=400,
                mimetype="application/json"
            )

        if not start_date_str:
            return func.HttpResponse(
                json.dumps({"error": "startDate is required (YYYY-MM-DD)"}),
                status_code=400,
                mimetype="application/json"
            )

        project_start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()

        # ---------- Download final report ----------
        excel_path = f"daily-reports/{project_name}/final-report.xlsx"
        blob_client = get_blob_client(excel_path)

        stream = io.BytesIO()
        blob_client.download_blob().readinto(stream)
        stream.seek(0)

        wb = load_workbook(stream)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        headers = [h.lower() for h in rows[0]]
        data_rows = rows[1:]

        daily_reports = []
        final_report_data = None

        for row in data_rows:
            row_dict = dict(zip(headers, row))

            if row_dict.get("type") == "daily_report":
                row_dict["normalized_date"] = normalize_date(row_dict["date"])
                daily_reports.append(row_dict)

            elif row_dict.get("type") == "final":
                final_report_data = row_dict.get("data")

        if not daily_reports:
            return func.HttpResponse(
                json.dumps({"error": "No daily reports found"}),
                status_code=400,
                mimetype="application/json"
            )

        if not final_report_data:
            return func.HttpResponse(
                json.dumps({"error": "No final report found"}),
                status_code=400,
                mimetype="application/json"
            )

        # ---------- Sort daily reports ----------
        daily_reports.sort(key=lambda x: x["normalized_date"])

        # ---------- Prepare LLM Prompt ----------
        daily_texts = "\n\n".join([
            f"Date: {d['normalized_date'].strftime('%Y-%m-%d')}\nDaily Report:\n{d['data']}"
            for d in daily_reports
        ])

        prompt = f"""
You are a senior construction project analyst.

FINAL REPORT:
{final_report_data}

DAILY REPORTS:
{daily_texts}

TASK:
For each daily report, compare the activities with the FINAL report and estimate cumulative progress.

Return ONLY valid JSON in this format:
[
  {{"date": "YYYY-MM-DD", "progress": number}}
]
"""

        completion = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You analyze construction project progress."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        llm_response = completion.choices[0].message.content.strip()
        llm_data = json.loads(llm_response)

        # ---------- Build progress map ----------
        progress_map = {
            datetime.fromisoformat(item["date"]).date(): item["progress"]
            for item in llm_data
        }

        # ---------- Fill missing dates from project start ----------
        end_date = daily_reports[-1]["normalized_date"]
        current_date = project_start_date

        chart_data = []
        last_progress = 0

        while current_date <= end_date:
            if current_date in progress_map:
                last_progress = progress_map[current_date]

            chart_data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "progress": last_progress
            })

            current_date += timedelta(days=1)

        return func.HttpResponse(
            json.dumps({"project": project_name,"chartData": chart_data}),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.exception("Failed to generate progress chart")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )