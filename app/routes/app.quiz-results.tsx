/**
 * Quiz Results Admin Page
 * Lists all customers with quiz data
 * Features: Search, Filtering, Customer Detail Modal, CSV Export
 */

import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const CUSTOMERS_WITH_METAFIELDS_QUERY = `
  query GetCustomersWithQuizData($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          email
          firstName
          lastName
          createdAt
          metafields(first: 10, namespace: "alledrops") {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    }
  }
`;

interface QuizHistoryEntry {
  date: string;
  score: number;
  severity: string;
  region: string;
  profileId: string;
}

interface QuizCustomer {
  id: string;
  email: string | null;
  name: string;
  quizScore: number | null;
  severityLevel: string | null;
  quizRegion: string | null;
  quizDate: string | null;
  symptomProfileId: string | null;
  quizHistory: QuizHistoryEntry[] | null;
  createdAt: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    // Query customers with their metafields
    // We'll fetch in batches and filter for those with quiz data
    const allCustomers: QuizCustomer[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let fetchCount = 0;
    const maxFetches = 10; // Limit to prevent timeout (10 batches = ~250 customers)
    
    while (hasNextPage && fetchCount < maxFetches) {
      const result = await admin.graphql(CUSTOMERS_WITH_METAFIELDS_QUERY, {
        variables: { first: 25, after: cursor },
      });
      
      const data = await result.json();
      
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        break;
      }
      
      const customersData = data.data?.customers;
      if (!customersData) break;
      
      // Process each customer and extract quiz data
      for (const edge of customersData.edges || []) {
        const customer = edge.node;
        const metafields = customer.metafields?.edges || [];
        
        // Create a map of metafields for easy lookup
        const metafieldMap: Record<string, string> = {};
        metafields.forEach((mfEdge: any) => {
          metafieldMap[mfEdge.node.key] = mfEdge.node.value;
        });
        
        // Only include customers who have taken the quiz
        if (metafieldMap.symptom_profile_id || metafieldMap.quiz_score !== undefined) {
          let quizHistory: QuizHistoryEntry[] | null = null;
          if (metafieldMap.quiz_history) {
            try {
              quizHistory = JSON.parse(metafieldMap.quiz_history);
            } catch {
              quizHistory = null;
            }
          }
          
          allCustomers.push({
            id: customer.id,
            email: customer.email,
            name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Unknown",
            quizScore: metafieldMap.quiz_score ? parseInt(metafieldMap.quiz_score, 10) : null,
            severityLevel: metafieldMap.severity_level || null,
            quizRegion: metafieldMap.quiz_region || null,
            quizDate: metafieldMap.quiz_date || null,
            symptomProfileId: metafieldMap.symptom_profile_id || null,
            quizHistory,
            createdAt: customer.createdAt,
          });
        }
      }
      
      hasNextPage = customersData.pageInfo?.hasNextPage || false;
      cursor = customersData.pageInfo?.endCursor || null;
      fetchCount++;
      
      // If we already have a good number of results, we can stop early
      if (allCustomers.length >= 100) break;
    }
    
    // Sort by quiz date (most recent first)
    allCustomers.sort((a, b) => {
      const dateA = a.quizDate ? new Date(a.quizDate).getTime() : 0;
      const dateB = b.quizDate ? new Date(b.quizDate).getTime() : 0;
      return dateB - dateA;
    });
    
    return { customers: allCustomers };
  } catch (error) {
    console.error("Error loading quiz results:", error);
    return { customers: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export default function QuizResultsPage() {
  const { customers = [], error } = useLoaderData<typeof loader>();
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // State for customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<QuizCustomer | null>(null);
  
  // Get unique values for filter dropdowns
  const uniqueSeverities = useMemo(() => {
    const severities = new Set(customers.map(c => c.severityLevel).filter(Boolean));
    return Array.from(severities).sort();
  }, [customers]);
  
  const uniqueRegions = useMemo(() => {
    const regions = new Set(customers.map(c => c.quizRegion).filter(Boolean));
    return Array.from(regions).sort();
  }, [customers]);
  
  // Filter customers based on search and filters
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter (name or email)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = customer.name.toLowerCase().includes(search);
        const emailMatch = customer.email?.toLowerCase().includes(search) || false;
        const profileMatch = customer.symptomProfileId?.toLowerCase().includes(search) || false;
        if (!nameMatch && !emailMatch && !profileMatch) return false;
      }
      
      // Severity filter
      if (severityFilter !== "all" && customer.severityLevel !== severityFilter) {
        return false;
      }
      
      // Region filter
      if (regionFilter !== "all" && customer.quizRegion !== regionFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== "all" && customer.quizDate) {
        const quizDate = new Date(customer.quizDate);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            if (quizDate.toDateString() !== now.toDateString()) return false;
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (quizDate < weekAgo) return false;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (quizDate < monthAgo) return false;
            break;
          case "quarter":
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (quizDate < quarterAgo) return false;
            break;
        }
      }
      
      return true;
    });
  }, [customers, searchTerm, severityFilter, regionFilter, dateFilter]);
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const severityCounts = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
    let totalScore = 0;
    let scoreCount = 0;
    
    filteredCustomers.forEach(c => {
      if (c.severityLevel && severityCounts.hasOwnProperty(c.severityLevel.toLowerCase())) {
        severityCounts[c.severityLevel.toLowerCase() as keyof typeof severityCounts]++;
      }
      if (c.quizScore !== null) {
        totalScore += c.quizScore;
        scoreCount++;
      }
    });
    
    return {
      total: filteredCustomers.length,
      ...severityCounts,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
    };
  }, [filteredCustomers]);
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };
  
  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity?.toLowerCase()) {
      case "minimal":
        return "#4CAF50"; // Green
      case "mild":
        return "#FF9800"; // Orange
      case "moderate":
        return "#FF5722"; // Deep Orange
      case "severe":
        return "#F44336"; // Red
      default:
        return "#666";
    }
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Name", "Email", "Score", "Severity", "Region", "Quiz Date", "Profile ID", "History Count"];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.email || "",
      c.quizScore?.toString() || "",
      c.severityLevel || "",
      c.quizRegion || "",
      c.quizDate || "",
      c.symptomProfileId || "",
      c.quizHistory?.length?.toString() || "0",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quiz-results-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSeverityFilter("all");
    setRegionFilter("all");
    setDateFilter("all");
  };
  
  const hasActiveFilters = searchTerm || severityFilter !== "all" || regionFilter !== "all" || dateFilter !== "all";

  return (
    <s-page heading="Quiz Results Dashboard">
      {/* Stats Summary */}
      <s-section>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
          gap: "12px",
          marginBottom: "20px"
        }}>
          <div style={{ 
            padding: "16px", 
            background: "#f6f6f7", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#202223" }}>{stats.total}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Total Submissions</div>
          </div>
          <div style={{ 
            padding: "16px", 
            background: "#e3f1df", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#4CAF50" }}>{stats.minimal}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Minimal</div>
          </div>
          <div style={{ 
            padding: "16px", 
            background: "#fff4e5", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#FF9800" }}>{stats.mild}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Mild</div>
          </div>
          <div style={{ 
            padding: "16px", 
            background: "#ffeee8", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#FF5722" }}>{stats.moderate}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Moderate</div>
          </div>
          <div style={{ 
            padding: "16px", 
            background: "#fce4e4", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#F44336" }}>{stats.severe}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Severe</div>
          </div>
          <div style={{ 
            padding: "16px", 
            background: "#e0f4ff", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#2196F3" }}>{stats.avgScore}</div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>Avg Score</div>
          </div>
        </div>
      </s-section>

      <s-section heading="Customer Quiz Submissions">
        {/* Search and Filters */}
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "12px", 
          marginBottom: "16px",
          padding: "16px",
          background: "#f6f6f7",
          borderRadius: "8px"
        }}>
          {/* Search Input */}
          <div style={{ flex: "1 1 250px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or profile ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          
          {/* Severity Filter */}
          <div style={{ flex: "0 1 150px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="all">All Severities</option>
              {uniqueSeverities.map(s => (
                <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : s}</option>
              ))}
            </select>
          </div>
          
          {/* Region Filter */}
          <div style={{ flex: "0 1 150px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
              Region
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="all">All Regions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : r}</option>
              ))}
            </select>
          </div>
          
          {/* Date Filter */}
          <div style={{ flex: "0 1 150px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px" }}>
              Time Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>
        </div>
        
        {/* Action Bar */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexWrap: "wrap", 
          gap: "12px",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Link to="/app/quiz">
              <s-button size="small">📝 Take Quiz (Test)</s-button>
                </Link>
            {filteredCustomers.length > 0 && (
              <s-button variant="secondary" size="small" onClick={exportToCSV}>
                📥 Export CSV
              </s-button>
                )}
            {hasActiveFilters && (
              <s-button variant="plain" size="small" onClick={clearFilters}>
                ✕ Clear Filters
              </s-button>
            )}
          </div>
          <div style={{ color: "#6d7175", fontSize: "14px" }}>
            Showing {filteredCustomers.length} of {customers.length} submission{customers.length !== 1 ? "s" : ""}
          </div>
        </div>
        
        {error && (
          <s-box padding="base" background="critical-subdued" borderRadius="base" marginBlockEnd="base">
            <s-text fontWeight="bold" color="critical">Error:</s-text> {error}
          </s-box>
        )}
        
        {filteredCustomers.length === 0 ? (
          <s-box padding="large" background="subdued" borderRadius="base">
            <s-paragraph>
              {customers.length === 0 
                ? "No quiz submissions yet. Once customers complete the quiz, their results will appear here."
                : "No results match your current filters. Try adjusting your search or filters."}
            </s-paragraph>
          </s-box>
        ) : (
          <s-box style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "800px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e1e3e5", textAlign: "left" }}>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Score</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Severity</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Region</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Quiz Date</th>
                    <th style={{ padding: "12px", fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      style={{
                        borderBottom: "1px solid #e1e3e5",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 500 }}>{customer.name}</div>
                        {customer.quizHistory && customer.quizHistory.length > 1 && (
                          <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "2px" }}>
                            {customer.quizHistory.length} assessments
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px", color: "#6d7175" }}>
                        {customer.email || "—"}
                      </td>
                      <td style={{ padding: "12px", fontWeight: 600 }}>
                        {customer.quizScore !== null ? `${customer.quizScore}/60` : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {customer.severityLevel ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor: getSeverityColor(customer.severityLevel) + "20",
                              color: getSeverityColor(customer.severityLevel),
                              fontWeight: 600,
                              textTransform: "capitalize",
                              fontSize: "12px",
                            }}
                          >
                            {customer.severityLevel}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px", textTransform: "capitalize" }}>
                        {customer.quizRegion || "—"}
                      </td>
                      <td style={{ padding: "12px", color: "#6d7175" }}>
                        {formatDate(customer.quizDate)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(customer);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#f6f6f7",
                            border: "1px solid #c9cccf",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </s-box>
        )}
      </s-section>
      
      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: "20px 24px", 
              borderBottom: "1px solid #e1e3e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
                  {selectedCustomer.name}
                </h2>
                <p style={{ margin: "4px 0 0", color: "#6d7175", fontSize: "14px" }}>
                  {selectedCustomer.email || "No email"}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6d7175",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: "24px" }}>
              {/* Latest Assessment Summary */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
                  Latest Assessment
                </h3>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "16px",
                  padding: "16px",
                  background: "#f9fafb",
                  borderRadius: "8px",
                }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Score</div>
                    <div style={{ fontSize: "24px", fontWeight: 700 }}>
                      {selectedCustomer.quizScore !== null ? `${selectedCustomer.quizScore}/60` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Severity</div>
                    <div>
                      {selectedCustomer.severityLevel && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            backgroundColor: getSeverityColor(selectedCustomer.severityLevel) + "20",
                            color: getSeverityColor(selectedCustomer.severityLevel),
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {selectedCustomer.severityLevel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Region</div>
                    <div style={{ fontSize: "16px", fontWeight: 500, textTransform: "capitalize" }}>
                      {selectedCustomer.quizRegion || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Date</div>
                    <div style={{ fontSize: "14px" }}>
                      {formatDate(selectedCustomer.quizDate)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Profile ID */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>Profile ID</h3>
                <div style={{ 
                  padding: "12px",
                  background: "#f6f6f7",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  wordBreak: "break-all",
                }}>
                  {selectedCustomer.symptomProfileId || "Not available"}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6d7175" }}>
                  Use this ID to find the full quiz responses in Google Sheets.
                </p>
              </div>
              
              {/* Quiz History */}
              {selectedCustomer.quizHistory && selectedCustomer.quizHistory.length > 0 && (
                <div>
                  <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
                    Assessment History ({selectedCustomer.quizHistory.length})
                  </h3>
                  <div style={{ 
                    border: "1px solid #e1e3e5",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}>
                    {selectedCustomer.quizHistory.map((entry, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px 16px",
                          borderBottom: index < selectedCustomer.quizHistory!.length - 1 ? "1px solid #e1e3e5" : "none",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                          <span style={{ 
                            fontWeight: 600,
                            minWidth: "50px",
                          }}>
                            {entry.score}/60
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor: getSeverityColor(entry.severity) + "20",
                              color: getSeverityColor(entry.severity),
                              fontWeight: 500,
                              textTransform: "capitalize",
                              fontSize: "12px",
                            }}
                          >
                            {entry.severity}
                          </span>
                          <span style={{ color: "#6d7175", textTransform: "capitalize" }}>
                            {entry.region}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#6d7175" }}>
                          {formatDateShort(entry.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Shopify Customer Link */}
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e1e3e5" }}>
                <a
                  href={`https://admin.shopify.com/store/aod-dev/customers/${selectedCustomer.id.replace("gid://shopify/Customer/", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#2c6ecb",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  View in Shopify Admin →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
