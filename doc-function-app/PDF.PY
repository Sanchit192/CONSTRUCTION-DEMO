from fpdf import FPDF

# Create instance of FPDF class
pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()
pdf.set_font("Arial", "B", 16)

# Title
pdf.cell(0, 10, "DAILY PROJECT REPORT – EPC CONTRACTOR", ln=True, align="C")
pdf.set_font("Arial", "", 12)
pdf.cell(0, 10, "Date: 14-Jan-2026", ln=True)
pdf.cell(0, 10, "Project: [Insert Project Name]", ln=True)
pdf.cell(0, 10, "Prepared By: [Your Name]", ln=True)
pdf.ln(10)

# Section 1: Scope & Work Progress
pdf.set_font("Arial", "B", 14)
pdf.cell(0, 10, "1. Scope & Work Progress", ln=True)
pdf.set_font("Arial", "", 12)

scope_data = [
    ["Route survey & alignment", "Complete (Week 1-2)", "Partial", "Survey data incomplete; missing profiles for 3 locations"],
    ["Geotechnical investigation", "Complete (Week 1-2)", "Complete", "No anomalies"],
    ["Engineering & IFC drawings", "Due Week 3-4", "Delayed", "IFC drawings for 2 crossings not approved"],
    ["Procurement of pipes & fittings", "Week 5-6", "Partial", "Delayed delivery of 20% of valves"],
    ["Trenching, stringing, welding", "Week 7-12", "Started Week 8", "Delay due to ROW clearance issues"],
    ["Hydrotesting & drying", "Week 13-15", "Not started", "N/A – pending pipeline completion"],
    ["Commissioning", "Week 16-18", "Not started", "N/A – pending hydrotesting"]
]

for row in scope_data:
    pdf.cell(0, 8, f"{row[0]} | Planned: {row[1]} | Actual: {row[2]} | Anomalies: {row[3]}", ln=True)

pdf.ln(5)

# Section 2: Deliverables Status
pdf.set_font("Arial", "B", 14)
pdf.cell(0, 10, "2. Deliverables Status", ln=True)
pdf.set_font("Arial", "", 12)

deliverables_data = [
    ["Approved IFC drawings", "Week 4", "Partial", "Missing approvals for 2 crossings"],
    ["Daily progress reports", "Daily", "Intermittent", "3 days missing logs last week"],
    ["Weld maps & NDT reports", "Week 12", "Partial", "Weld maps for 10% of pipeline not submitted"],
    ["Hydrotest & commissioning certificates", "Week 15", "Not received", "Pending testing completion"],
    ["As-built drawings & final data books", "Week 18", "Not received", "N/A"]
]

for row in deliverables_data:
    pdf.cell(0, 8, f"{row[0]} | Planned: {row[1]} | Received: {row[2]} | Comments: {row[3]}", ln=True)

pdf.ln(5)

# Section 3: Weekly Execution Timeline Deviations
pdf.set_font("Arial", "B", 14)
pdf.cell(0, 10, "3. Weekly Execution Timeline Deviations", ln=True)
pdf.set_font("Arial", "", 12)

timeline_data = [
    ["3–4", "Detailed engineering & permits", "Delayed permit approval for 2 crossings"],
    ["5–6", "Material procurement & delivery", "20% of valves delayed, affecting schedule"],
    ["7–12", "Mainline construction", "ROW clearance issues causing 1-week delay"],
    ["13–15", "Hydrotest & drying", "Not started – pending completion of construction"],
    ["16–18", "Commissioning & handover", "On hold – dependent on prior activities"]
]

for row in timeline_data:
    pdf.cell(0, 8, f"Week {row[0]} | Planned: {row[1]} | Observed Deviations: {row[2]}", ln=True)

# Save PDF
output_path = "/mnt/data/Daily_Project_Report_EPC.pdf"
pdf.output(output_path)
output_path
