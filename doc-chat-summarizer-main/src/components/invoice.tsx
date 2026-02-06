import { useState, useMemo, useEffect } from 'react';
import { StatCard } from '@/components/StatCard';
import { MatchingTable } from '@/components/MatchingTable';
import { MatchingDetails } from '@/components/MatchingDetails';
import { AnomalyCard } from '@/components/AnomalyCard';
import { MatchingResult } from '@/types/invoice';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Package,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

/* ===========================
   TYPES
=========================== */
type Project = {
  id: string;
  name: string;
};

const API_BASE =
  "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

// const API_BASE = "http://localhost:7071/api";

const InvoiceWorkspace = () => {
  const [selectedResult, setSelectedResult] =
    useState<MatchingResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [selectedAnomalyStep, setSelectedAnomalyStep] = useState<'step1' | 'step2' | 'step3' | null>(null);
  const [analyzedAnomalies, setAnalyzedAnomalies] = useState<Map<string, any[]>>(new Map());
    const [analyzedPOs, setAnalyzedPOs] = useState<Set<string>>(new Set());

  // Map fresh anomalies from analyze button (no Created_At filtering)
  const mapFreshAnomalies = (anomalies: any[] = []) => {
    return anomalies.map((anomaly: any, index: number) => {
      const severityRaw = (anomaly.severity || '').toString().toLowerCase();
      const severity = severityRaw.includes('high')
        ? 'high'
        : severityRaw.includes('low')
          ? 'low'
          : severityRaw.includes('medium')
            ? 'medium'
            : 'high';

      return {
        id: anomaly.id || `${anomaly.description || 'anomaly'}-${index}`,
        type: anomaly.type || 'total_mismatch',
        severity,
        description: anomaly.description || 'Issue detected',
        field: anomaly.field || 'amount',
        expectedValue: anomaly.expectedValue ?? '',
        actualValue: anomaly.actualValue ?? '',
        step: anomaly.step || 'po_receipt',
      };
    });
  };

  // Map Salesforce anomalies with Created_At filtering (for page reload)
  const mapSalesforceAnomalies = (anomalies: any[] = [], defaultStep: string = 'po_receipt') => {
    // Find the globally latest timestamp across all anomalies
    let latestTimestamp = 0;
    for (const anomaly of anomalies) {
      const anomalyDate = new Date(anomaly.Created_At || 0).getTime();
      if (anomalyDate > latestTimestamp) {
        latestTimestamp = anomalyDate;
      }
    }
    
    // Keep only anomalies with the latest timestamp
    const latestAnomalies = anomalies.filter((anomaly: any) => {
      const anomalyDate = new Date(anomaly.Created_At || 0).getTime();
      return anomalyDate === latestTimestamp;
    });
    
    return latestAnomalies.map((anomaly: any, index: number) => {
      const severityRaw = (anomaly.Severity || anomaly.severity || '').toString().toLowerCase();
      const severity = severityRaw.includes('high')
        ? 'high'
        : severityRaw.includes('low')
          ? 'low'
          : severityRaw.includes('medium')
            ? 'medium'
            : 'high';

      // Parse description and field type from "Description / fieldType" format
      const detailRaw = anomaly.Detail || anomaly.Details || anomaly.description || 'Issue detected';
      const parts = detailRaw.split(' / ');
      const description = parts[0].trim();
      const fieldType = parts.length > 1 ? parts[1].trim() : (anomaly.field || 'amount');

      return {
        id: anomaly.Id || anomaly.id || `${anomaly.Detail || anomaly.description || 'anomaly'}-${index}`,
        type: anomaly.type || 'total_mismatch',
        severity,
        description: description,
        field: fieldType,
        expectedValue: anomaly.Expected ?? anomaly.expectedValue ?? '',
        actualValue: anomaly.Actual ?? anomaly.actualValue ?? '',
        step: anomaly.step || defaultStep,
      };
    });
  };

  /* ===========================
     DATA
  =========================== */
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);

  /* ===========================
     FETCH PROJECTS
  =========================== */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`);
        const data = await res.json();
        console.log('Fetched projects:', data);
        // If API returns array of strings, map to { id, name }
        if (Array.isArray(data) && typeof data[0] === 'string') {
          setProjects(data.map((name, idx) => ({ id: String(idx), name })));
        } else {
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects', error);
      }
    };

    fetchProjects();
  }, []);

  /* ===========================
     FETCH INVOICES BY PROJECT
  =========================== */
  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoadingInvoices(true);
      try {
        if (selectedProject === 'all') {
          if (projects.length === 0) {
            setInvoices([]);
            return;
          }

          const responses = await Promise.all(
            projects.map((project) =>
              fetch(`${API_BASE}/projects/${encodeURIComponent(project.name)}/invoices`)
            )
          );

          const allData = await Promise.all(responses.map((res) => res.json()));
          const flattened = allData.flat();
          console.log('Fetched invoices for all projects:', flattened);
          setInvoices(flattened);
        } else {
          const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(selectedProject)}/invoices`);
          const data = await res.json();
          console.log('Fetched invoices for project:', selectedProject, data);
          setInvoices(data);
        }
      } catch (error) {
        console.error('Failed to fetch invoices', error);
        setInvoices([]);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [selectedProject, projects]);

  /* ===========================
     CONVERT API INVOICES TO MATCHING RESULTS
  =========================== */
  const apiMatchingResults = useMemo(() => {
    return invoices.map((invoice): MatchingResult => {
      // Map LineItems from Salesforce response
      const mappedLineItems = (invoice.LineItems || []).map((item: any) => ({
        id: item.Id,
        description: item.Description,
        quantity: item.Quantity,
        unitPrice: item.Unit_Price || 0,
        total: item.Total_Price_of_Line_Item || 0,
      }));

      const isPending = invoice.PO_Status === 'To be Verified';
      const receiptData = invoice.receiptData;
      
      // Extract invoice data from receiptData if it exists (from Salesforce)
      let salesforceInvoice: any = null;
      if (receiptData?.invoiceData) {
        const invoiceDataArray = Array.isArray(receiptData.invoiceData) 
          ? receiptData.invoiceData 
          : [receiptData.invoiceData];
        
        // Filter to get only the invoice matching the current OrderID
        const currentOrderId = invoice.OrderID || invoice.orderId || invoice.Order_Id || invoice.Order_Id__c;
        const matchingInvoice = invoiceDataArray.find((inv: any) => 
          (inv.OrderID === currentOrderId) || (inv.orderId === currentOrderId)
        );
        const sfInv = matchingInvoice || invoiceDataArray[0];
        
        if (sfInv && invoiceDataArray.length > 0) {
          const invoiceLineItems = (sfInv.LineItems || []).map((item: any) => ({
            id: item.Id || `item-${Math.random()}`,
            description: item.Description || '',
            quantity: item.Quantity || 0,
            unitPrice: item.Unit_Price || 0,
            total: item.Total_Price_of_Line_Item || 0,
          }));

          const invoiceTotal = invoiceLineItems.reduce(
            (sum: number, item: any) => sum + (item.total || 0),
            0
          );

          salesforceInvoice = {
            id: sfInv.Id || 'N/A',
            invoiceNumber: sfInv.Invoice_Number || sfInv.InvoiceNumber || 'N/A',
            orderId: sfInv.OrderID || 'N/A',
            vendor: sfInv.Client_Name || 'Unknown',
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: sfInv.Due_Date || '',
            lineItems: invoiceLineItems,
            totalAmount: invoiceTotal || sfInv.Amount || 0,
            status: (sfInv.Anomalies?.length === 0 || !sfInv.Anomalies) && (sfInv.InvoiceStatus === 'To be Verified') ? 'pending' : (sfInv.InvoiceStatus || 'pending'),
            anomalies: sfInv.Anomalies || [], // Store raw anomalies with Created_At for filtering
            hasBeenAnalyzed: (sfInv.Anomalies && sfInv.Anomalies.length >= 0),
          };
        }
      }
      
      // Use only current anomalies from the response (don't use cache to ensure latest data)
      const anomaliesToUse = invoice.Anomalies || [];
      const hasAnomalies = anomaliesToUse && anomaliesToUse.length > 0;
      // PO is considered analyzed if it's in the analyzedPOs set OR if it's status is "Verified"
      const isAnalyzed = analyzedPOs.has(invoice.PO_Number) || invoice.PO_Status === 'Verified';

      const receiptLineItems = receiptData?.lineItems && receiptData.lineItems.length > 0
        ? receiptData.lineItems.map((item: any) => ({
            id: item.id || item.Id || item.item_id || `item-${Math.random()}`,
            description: item.description || item.Description || item.item_name || '',
            quantity: item.quantity || item.Quantity || 0,
            unitPrice: item.unitPrice || item.Unit_Price || item.unit_price || 0,
            total: item.total || item.Total_Price_of_Line_Item || item.total_price || 0,
          }))
        : (invoice.LineItems || []).map((item: any) => ({
            id: item.Id || `item-${Math.random()}`,
            description: item.Description || '',
            quantity: item.Quantity || 0,
            unitPrice: item.Unit_Price || 0,
            total: item.Total_Price_of_Line_Item || 0,
          }));

      const receiptTotal = receiptLineItems.reduce(
        (sum: number, item: any) => sum + (item.total || 0),
        0
      );

      // Map receipt anomalies if they exist - treat null/undefined/empty as analyzed with no anomalies
      const hasAnalyzedReceipt = receiptData && 'anomalies' in receiptData;
      const receiptAnomalies = hasAnalyzedReceipt && receiptData.anomalies && Array.isArray(receiptData.anomalies)
        ? receiptData.anomalies.map((anomaly: any, index: number) => {
            const severityRaw = (anomaly.severity || '').toString().toLowerCase();
            const severity = severityRaw.includes('high')
              ? 'high'
              : severityRaw.includes('low')
                ? 'low'
                : severityRaw.includes('medium')
                  ? 'medium'
                  : 'high';

            const step = anomaly.step === 'po_receipt' ? 'receipt_invoice' : (anomaly.step || 'receipt_invoice');

            return {
              id: anomaly.id || `${anomaly.type || 'anomaly'}-${index}`,
              type: anomaly.type || 'total_mismatch',
              severity,
              description: anomaly.description || 'Issue detected',
              field: anomaly.field || 'amount',
              expectedValue: anomaly.expectedValue ?? '',
              actualValue: anomaly.actualValue ?? '',
              step,
            };
          })
        : [];

      const receipt = receiptData
        ? {
            id: receiptData.receiptId || 'N/A',
            receiptNumber: receiptData.receiptId || 'N/A',
            poNumber: invoice.PO_Number || 'N/A',
            vendor: invoice.Client_Name || 'Unknown',
            receivedDate: receiptData.createdAt?.split(' ')[0] || new Date().toISOString().split('T')[0],
            receivedBy: receiptData.createdBy || 'N/A',
            lineItems: receiptLineItems,
            totalAmount: receiptTotal || invoice.Total_PO_Price || invoice.Amount || 0,
            status: 'pending',
            anomalies: receiptAnomalies,
            hasBeenAnalyzed: hasAnalyzedReceipt,
          }
        : null;

      return {
        poNumber: invoice.PO_Number || 'N/A',
        projectName: invoice.Project_Name || (selectedProject !== 'all' ? selectedProject : 'Unknown Project'),
        purchaseOrder: {
          id: invoice.Id,
          OrderID: invoice.OrderID || invoice.orderId || invoice.Order_Id || invoice.Order_Id__c,
          poNumber: invoice.PO_Number || 'N/A',
          vendor: invoice.Client_Name || 'Unknown',
          date: new Date().toISOString().split('T')[0],
          expectedDelivery: invoice.Due_Date || '',
          lineItems: mappedLineItems,
          totalAmount: invoice.Total_PO_Price || invoice.Amount || 0,
          status: isPending ? 'pending' : 'matched',
        },
        invoice: salesforceInvoice,
        receipt,
        step1Anomalies: mapSalesforceAnomalies(anomaliesToUse, 'po_receipt'),
        step2Anomalies: receiptAnomalies,
        step3Anomalies: salesforceInvoice ? mapSalesforceAnomalies(salesforceInvoice.anomalies, 'receipt_invoice') : [],
        overallStatus: hasAnomalies || receiptAnomalies.length > 0 || (salesforceInvoice && salesforceInvoice.anomalies.length > 0)
          ? 'anomaly'
          : (salesforceInvoice && salesforceInvoice.status === 'To be Paid')
            ? 'complete'
            : isAnalyzed
              ? 'partial'
              : (isPending ? 'pending' : 'partial'),
      };
    });
  }, [invoices, selectedProject, analyzedAnomalies, analyzedPOs]);

  /* ===========================
     FILTER BY PROJECT
  =========================== */
  const projectFilteredResults = useMemo(() => {
    // Use only API data from Salesforce
    return apiMatchingResults;
  }, [apiMatchingResults]);

  /* ===========================
     STATS
  =========================== */
  const stats = useMemo(() => {
    // Use actual data count (API or mock)
    const totalPOs = projectFilteredResults.length;
    const matched = projectFilteredResults.filter(
      (r) => r.overallStatus === 'complete'
    ).length;
    const anomalies = projectFilteredResults.filter(
      (r) => r.overallStatus === 'anomaly'
    ).length;
    const pending = projectFilteredResults.filter(
      (r) =>
        r.overallStatus === 'pending' ||
        r.overallStatus === 'partial'
    ).length;

    const totalAnomalies = projectFilteredResults.reduce(
      (acc, r) =>
        acc +
        r.step1Anomalies.length +
        r.step2Anomalies.length +
        r.step3Anomalies.length,
      0
    );

    return { totalPOs, matched, anomalies, pending, totalAnomalies };
  }, [projectFilteredResults]);

  /* ===========================
     HANDLERS
  =========================== */
  const handleViewDetails = (result: MatchingResult) => {
    setSelectedResult(result);
    setSelectedAnomalyStep(null);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedAnomalyStep(null);
    }
  };

  const handleAnalyze = async (result: MatchingResult, type: 'po' | 'receipt' | 'invoice') => {
    // Use the project name from the result (each PO has its own project)
    const projectName = result.projectName;
    if (!projectName || projectName === 'all') {
      console.error('Invalid project name for analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      if (type === 'po') {
        // Analyze Purchase Order
        const res = await fetch(
          `${API_BASE}/projects/${encodeURIComponent(projectName)}/po-analyze-and-sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchaseOrder: result.purchaseOrder,
              existingAnomalies: result.step1Anomalies,
            }),
          }
        );

        const data = await res.json();
      
        if (!data.success) {
          console.error('PO Analysis failed:', data.error);
          return;
        }

        console.log('=== PO ANALYSIS DEBUG ===');
        console.log('Full response data:', data);
        console.log('data.anomalies:', data.anomalies);
        console.log('Type of data.anomalies:', typeof data.anomalies);
        console.log('Is array?', Array.isArray(data.anomalies));
        console.log('Length:', data.anomalies?.length);

        // Use fresh anomalies directly from API response (no filtering)
        const freshAnomalies = mapFreshAnomalies(data.anomalies || []);
        console.log('Fresh anomalies after mapping:', freshAnomalies);
        console.log('Fresh anomalies count:', freshAnomalies.length);
        console.log('=== END DEBUG ===');

        // Mark this PO as analyzed
        setAnalyzedPOs((prev) => {
          const newSet = new Set(prev);
          newSet.add(result.purchaseOrder.poNumber);
          return newSet;
        });

        // When no anomalies, create receipt object from API response
        let receiptToSet = null;
        if (freshAnomalies.length === 0 && data.receiptData) {
          console.log('No anomalies found, creating receipt object:', data.receiptData);
        
          // Use line items from receiptData
          const receiptLineItems = data.receiptData.lineItems && data.receiptData.lineItems.length > 0
            ? data.receiptData.lineItems.map((item: any) => ({
                id: item.id || item.Id || item.item_id || `item-${Math.random()}`,
                description: item.description || item.Description || item.item_name || '',
                quantity: item.quantity || item.Quantity || 0,
                unitPrice: item.unitPrice || item.Unit_Price || item.unit_price || 0,
                total: item.total || item.Total_Price_of_Line_Item || item.total_price || 0,
              }))
            : [];
        
          // Calculate total from line items
          const calculatedTotal = receiptLineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
        
          receiptToSet = {
            id: data.receiptData.receiptId || 'N/A',
            receiptNumber: data.receiptData.receiptId || 'N/A',
            poNumber: result.purchaseOrder.poNumber,
            vendor: result.purchaseOrder.vendor || 'Unknown',
            receivedDate: data.receiptData.createdAt?.split(' ')[0] || new Date().toISOString().split('T')[0],
            receivedBy: data.receiptData.createdBy || 'N/A',
            lineItems: receiptLineItems,
            totalAmount: calculatedTotal || result.purchaseOrder.totalAmount || 0,
            status: 'pending',
          };
        }

        setSelectedResult((prev) => {
          console.log('=== STATE UPDATE ===');
          console.log('Previous selectedResult:', prev);
          console.log('Setting step1Anomalies to:', freshAnomalies);
          
          if (!prev) return prev;
          const overallStatus = freshAnomalies.length > 0
            ? 'anomaly'
            : 'partial';

          const newResult = {
            ...prev,
            step1Anomalies: freshAnomalies,
            receipt: receiptToSet,
            overallStatus,
          };
          
          console.log('New selectedResult:', newResult);
          console.log('New step1Anomalies length:', newResult.step1Anomalies.length);
          console.log('=== END STATE UPDATE ===');
          
          return newResult;
        });

        // Update the invoices array so the card reflects the new anomalies
        setInvoices((prevInvoices) =>
          prevInvoices.map((inv) =>
            inv.PO_Number === result.poNumber && inv.Project_Name === result.projectName
              ? {
                  ...inv,
                  Anomalies: data.anomalies || [], // Store raw anomalies with Created_At
                  PO_Status: freshAnomalies.length > 0 ? 'To be Verified' : inv.PO_Status,
                  receiptData: receiptToSet ? {
                    receiptId: receiptToSet.receiptNumber,
                    createdAt: receiptToSet.receivedDate,
                    createdBy: receiptToSet.receivedBy,
                    lineItems: receiptToSet.lineItems,
                  } : inv.receiptData,
                }
              : inv
          )
        );

      } else if (type === 'receipt') {
        if (!result.receipt) {
          console.error('Receipt data is required to analyze');
          return;
        }

        const receiptForAnalysis = {
          receiptNumber: result.receipt.receiptNumber,
          poNumber: result.receipt.poNumber,
          vendor: result.receipt.vendor,
          receivedDate: result.receipt.receivedDate,
          receivedBy: result.receipt.receivedBy,
          totalAmount: result.receipt.totalAmount,
          lineItems: result.receipt.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
          })),
          id: result.receipt.id,
          receiptId: result.receipt.receiptNumber,
        };

        const res = await fetch(
          `${API_BASE}/projects/${encodeURIComponent(projectName)}/receipt-analyze`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchaseOrder: result.purchaseOrder,
              receipt: receiptForAnalysis,
            }),
          }
        );

        const data = await res.json();
        if (!data.success) {
          console.error('Receipt Analysis failed:', data.error);
          return;
        }

        const receiptAnomalies = (data.anomalies || []).map((anomaly: any, index: number) => ({
          id: anomaly.id || `${anomaly.type || 'anomaly'}-${index}`,
          type: anomaly.type || 'total_mismatch',
          severity: anomaly.severity || 'high',
          description: anomaly.description || 'Issue detected',
          field: anomaly.field || 'amount',
          expectedValue: anomaly.expectedValue ?? '',
          actualValue: anomaly.actualValue ?? '',
          step: anomaly.step || 'po_receipt',
        }));

        setSelectedResult((prev) => {
          if (!prev) return prev;
          const overallStatus = receiptAnomalies.length > 0 ? 'anomaly' : 'partial';
          return {
            ...prev,
            step2Anomalies: receiptAnomalies,
            overallStatus,
            receipt: prev.receipt
              ? {
                  ...prev.receipt,
                  status: receiptAnomalies.length > 0 ? 'anomaly' : 'matched',
                  anomalies: receiptAnomalies,
                }
              : prev.receipt,
          };
        });

        // If no receipt anomalies, fetch invoice from Salesforce
        if (receiptAnomalies.length === 0 && result.receipt) {
          console.log('No receipt anomalies, fetching invoice from Salesforce...');
          
          const orderId = result.receipt.poNumber || result.purchaseOrder.poNumber;
          
          const invoiceRes = await fetch(
            `${API_BASE}/projects/${encodeURIComponent(projectName)}/invoice/${encodeURIComponent(orderId)}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          const invoiceData = await invoiceRes.json();
          
          if (invoiceData.success && invoiceData.invoice) {
            const invoiceArray = Array.isArray(invoiceData.invoice) ? invoiceData.invoice : [invoiceData.invoice];
            const invoice = invoiceArray[0];
            
            console.log('Fetched invoice from Salesforce:', invoice);

            // Parse invoice into our format
            const parsedInvoice = {
              id: invoice.Id || invoice.id || `invoice-${orderId}`,
              orderId: invoice.OrderID || invoice.orderId || orderId,
              invoiceNumber: invoice.Invoice_Number || invoice.InvoiceNumber || '',
              poNumber: invoice.PO_Number || invoice.PONumber || orderId,
              vendor: invoice.Client_Name || invoice.ClientName || '',
              invoiceDate: invoice.Invoice_Date || invoice.InvoiceDate || new Date().toISOString().split('T')[0],
              dueDate: invoice.Due_Date || invoice.DueDate || '',
              lineItems: (invoice.LineItems || []).map((item: any) => ({
                id: item.Id || item.id || `item-${Math.random()}`,
                description: item.Description || '',
                quantity: item.Quantity || 0,
                unitPrice: item.Unit_Price || 0,
                total: item.Total_Price_of_Line_Item || 0,
              })),
              totalAmount: invoice.Amount || 0,
              status: invoice.InvoiceStatus === 'To be Paid' ? 'matched' : 'pending',
            };

            setSelectedResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                invoice: parsedInvoice,
              };
            });
          } else {
            console.warn('Failed to fetch invoice:', invoiceData.error || 'Unknown error');
          }
        }
      } else if (type === 'invoice') {
        if (!result.receipt || !result.invoice) {
          console.error('Receipt and Invoice data are required to analyze');
          return;
        }

        // Use the actual OrderID from invoice
        const orderId = (result.invoice as any).orderId || result.receipt.poNumber || result.purchaseOrder.poNumber;

        const receiptForAnalysis = {
          receiptNumber: result.receipt.receiptNumber,
          poNumber: result.receipt.poNumber,
          vendor: result.receipt.vendor,
          receivedDate: result.receipt.receivedDate,
          receivedBy: result.receipt.receivedBy,
          totalAmount: result.receipt.totalAmount,
          lineItems: result.receipt.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
          })),
        };

        const invoiceForAnalysis = {
          invoiceNumber: result.invoice.invoiceNumber,
          poNumber: result.invoice.poNumber,
          vendor: result.invoice.vendor,
          invoiceDate: result.invoice.invoiceDate,
          dueDate: result.invoice.dueDate,
          totalAmount: result.invoice.totalAmount,
          lineItems: result.invoice.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
          })),
        };

        console.log('Analyzing invoice against receipt...');

        const res = await fetch(
          `${API_BASE}/projects/${encodeURIComponent(projectName)}/invoice-analyze-and-sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receipt: receiptForAnalysis,
              invoice: invoiceForAnalysis,
              orderId: orderId,
            }),
          }
        );

        const data = await res.json();
        if (!data.success) {
          console.error('Invoice Analysis failed:', data.error);
          return;
        }

        console.log('Invoice analysis response:', data);

        const invoiceAnomalies = (data.anomalies || []).map((anomaly: any, index: number) => ({
          id: anomaly.id || `${anomaly.type || 'anomaly'}-${index}`,
          type: anomaly.type || 'total_mismatch',
          severity: anomaly.severity || 'high',
          description: anomaly.description || 'Issue detected',
          field: anomaly.field || 'amount',
          expectedValue: anomaly.expectedValue ?? '',
          actualValue: anomaly.actualValue ?? '',
          step: anomaly.step || 'invoice_receipt',
        }));

        setSelectedResult((prev) => {
          if (!prev) return prev;
          const overallStatus = invoiceAnomalies.length > 0 ? 'anomaly' : 'complete';
          return {
            ...prev,
            step3Anomalies: invoiceAnomalies,
            overallStatus,
            invoice: prev.invoice
              ? {
                  ...prev.invoice,
                  status: data.invoiceStatus === 'To be Paid' ? 'matched' : 'pending',
                }
              : prev.invoice,
          };
        });
      }
    } catch (error) {
      console.error('Analyze and sync failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadAnomalies = () => {
    if (!selectedAnomalyStep) return;

    // Get all results with anomalies for the selected step
    const resultsWithAnomalies = projectFilteredResults.filter((result) => {
      if (selectedAnomalyStep === 'step1') return result.step1Anomalies.length > 0;
      if (selectedAnomalyStep === 'step2') return result.step2Anomalies.length > 0;
      return result.step3Anomalies.length > 0;
    });

    // Build PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    const stepTitle = selectedAnomalyStep === 'step1' 
      ? 'Step 1: PO <-> SOW Anomalies'
      : selectedAnomalyStep === 'step2' 
      ? 'Step 2: PO <-> Receipt Anomalies'
      : 'Step 3: Receipt <-> Invoice Anomalies';

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(stepTitle, margin, yPosition);
    yPosition += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Project: ${selectedProject === 'all' ? 'All Projects' : selectedProject}`, margin, yPosition);
    yPosition += 10;

    resultsWithAnomalies.forEach((result, resultIndex) => {
      const anomalies = selectedAnomalyStep === 'step1' 
        ? result.step1Anomalies 
        : selectedAnomalyStep === 'step2' 
        ? result.step2Anomalies 
        : result.step3Anomalies;

      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      // PO Header
      doc.setFillColor(240, 240, 255);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 25, 'F');
      
      yPosition += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`PO Number: ${result.poNumber}`, margin + 3, yPosition);
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Vendor: ${result.purchaseOrder.vendor}`, margin + 3, yPosition);
      yPosition += 5;
      
      doc.text(`Date: ${result.purchaseOrder.date}`, margin + 3, yPosition);
      if (result.purchaseOrder.expectedDelivery) {
        doc.text(`Expected: ${result.purchaseOrder.expectedDelivery}`, margin + 80, yPosition);
      }
      yPosition += 5;
      
      doc.text(`Total Anomalies: ${anomalies.length}`, margin + 3, yPosition);
      yPosition += 10;

      // Anomalies
      anomalies.forEach((anomaly, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const description = `${index + 1}. ${anomaly.description}`;
        const lines = doc.splitTextToSize(description, pageWidth - 2 * margin - 6);
        doc.text(lines, margin + 3, yPosition);
        yPosition += lines.length * 5;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Severity: ${anomaly.severity.toUpperCase()}`, margin + 6, yPosition);
        yPosition += 5;
        
        doc.text(`Expected: ${anomaly.expectedValue}`, margin + 6, yPosition);
        yPosition += 5;
        
        doc.text(`Actual: ${anomaly.actualValue}`, margin + 6, yPosition);
        yPosition += 5;
        
        doc.text(`Field: ${anomaly.field}`, margin + 6, yPosition);
        yPosition += 8;
      });

      yPosition += 5;
    });

    // Download
    doc.save(`anomalies-${selectedAnomalyStep}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return projectFilteredResults;
    if (status === 'anomaly')
      return projectFilteredResults.filter(
        (r) => r.overallStatus === 'anomaly'
      );
    if (status === 'pending')
      return projectFilteredResults.filter(
        (r) =>
          r.overallStatus === 'pending' ||
          r.overallStatus === 'partial'
      );
    return projectFilteredResults.filter(
      (r) => r.overallStatus === 'complete'
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 space-y-8">

        {/* ================= HEADER + PROJECT SELECT ================= */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">
              Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor 3-way invoice matching and detect anomalies in real-time
            </p>
          </div>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Purchase Orders" value={stats.totalPOs} icon={FileText} />
          <StatCard title="Fully Matched" value={stats.matched} icon={CheckCircle2} variant="success" />
          <StatCard title="With Anomalies" value={stats.anomalies} icon={AlertTriangle} variant="destructive" />
          <StatCard title="Pending Review" value={stats.pending} icon={Clock} variant="warning" />
        </div>

        {/* ================= ANOMALY SUMMARY ================= */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Anomaly Detection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Step 1: PO ↔ SOW"
                count={projectFilteredResults.reduce((a, r) => a + r.step1Anomalies.length, 0)}
                icon={<FileText className="h-5 w-5" />}
                onClick={() => {
                  setSelectedAnomalyStep('step1');
                  setAnomalyModalOpen(true);
                }}
              />
              <SummaryCard
                title="Step 2: PO ↔ Receipt"
                count={projectFilteredResults.reduce((a, r) => a + r.step2Anomalies.length, 0)}
                icon={<Package className="h-5 w-5" />}
                onClick={() => {
                  setSelectedAnomalyStep('step2');
                  setAnomalyModalOpen(true);
                }}
              />
              <SummaryCard
                title="Step 3: Receipt ↔ Invoice"
                count={projectFilteredResults.reduce((a, r) => a + r.step3Anomalies.length, 0)}
                icon={<Receipt className="h-5 w-5" />}
                onClick={() => {
                  setSelectedAnomalyStep('step3');
                  setAnomalyModalOpen(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= MATCHING TABLE ================= */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({projectFilteredResults.length})</TabsTrigger>
                <TabsTrigger value="complete">Matched ({stats.matched})</TabsTrigger>
                <TabsTrigger value="anomaly">Anomalies ({stats.anomalies})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              </TabsList>

              {['all', 'complete', 'anomaly', 'pending'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <MatchingTable
                    results={filterByStatus(tab)}
                    onViewDetails={handleViewDetails}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* ================= ANOMALY MODAL ================= */}
        <Dialog open={anomalyModalOpen} onOpenChange={setAnomalyModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {selectedAnomalyStep === 'step1' && 'Step 1: PO ↔ SOW Anomalies'}
                  {selectedAnomalyStep === 'step2' && 'Step 2: PO ↔ Receipt Anomalies'}
                  {selectedAnomalyStep === 'step3' && 'Step 3: Receipt ↔ Invoice Anomalies'}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAnomalies}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              {selectedAnomalyStep && 
                projectFilteredResults
                  .filter((result) => {
                    if (selectedAnomalyStep === 'step1') return result.step1Anomalies.length > 0;
                    if (selectedAnomalyStep === 'step2') return result.step2Anomalies.length > 0;
                    return result.step3Anomalies.length > 0;
                  })
                  .map((result) => {
                    const anomalies = selectedAnomalyStep === 'step1' 
                      ? result.step1Anomalies 
                      : selectedAnomalyStep === 'step2' 
                      ? result.step2Anomalies 
                      : result.step3Anomalies;
                    
                    return (
                      <div key={result.poNumber} className="space-y-3">
                        {/* PO Header */}
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-sm">{result.poNumber}</p>
                                <p className="text-xs text-muted-foreground">{result.purchaseOrder.vendor}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Date: {result.purchaseOrder.date}</p>
                                {result.purchaseOrder.expectedDelivery && (
                                  <p className="text-xs text-muted-foreground">Expected: {result.purchaseOrder.expectedDelivery}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Anomalies for this PO */}
                        {anomalies.map((anomaly) => (
                          <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                        ))}
                      </div>
                    );
                  })}
              {selectedAnomalyStep && 
                projectFilteredResults
                  .flatMap((result) => {
                    if (selectedAnomalyStep === 'step1') return result.step1Anomalies;
                    if (selectedAnomalyStep === 'step2') return result.step2Anomalies;
                    return result.step3Anomalies;
                  }).length === 0 && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-600">
                      ✓ No anomalies found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No anomalies detected in this step.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* ================= DETAILS MODAL ================= */}
      <MatchingDetails
        result={selectedResult}
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
          hasAnalyzed={selectedResult ? (analyzedPOs.has(selectedResult.purchaseOrder.poNumber) || selectedResult.purchaseOrder.status === 'matched') : false}
      />
    </div>
  );
};

/* ===========================
   SMALL SUMMARY CARD
=========================== */
const SummaryCard = ({
  title,
  count,
  icon,
  onClick,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className="p-4 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 hover:border-primary/50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{count} issues</p>
      </div>
    </div>
  </div>
);

export default InvoiceWorkspace;
