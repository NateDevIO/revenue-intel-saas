"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCustomers,
  getHealthDistribution,
  getCustomerSegments,
} from "@/lib/api";
import {
  formatCurrency,
  formatPercent,
  formatDays,
  getHealthColor,
  getChurnColor,
  getRiskLevel,
} from "@/lib/utils";
import { exportCustomersCSV } from "@/lib/export";
import type { Customer, HealthDistribution } from "@/types";
import { CustomerInsights } from "@/components/ai/customer-insights";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  Search,
  Download,
} from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [healthDist, setHealthDist] = useState<{
    distribution: HealthDistribution;
    total_customers: number;
    total_mrr: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filters
  const [status, setStatus] = useState("Active");
  const [health, setHealth] = useState<string>("all");
  const [companySize, setCompanySize] = useState<string>("all");
  const [sortBy, setSortBy] = useState("churn_probability");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 20;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [customersData, healthData] = await Promise.all([
          getCustomers({
            status,
            health: health !== "all" ? health : undefined,
            company_size: companySize !== "all" ? companySize : undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
            limit,
            offset: page * limit,
          }),
          getHealthDistribution(),
        ]);
        setCustomers(customersData.customers);
        setTotal(customersData.total);
        setHealthDist(healthData);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [status, health, companySize, sortBy, sortOrder, page]);

  const totalPages = Math.ceil(total / limit);

  // Client-side search filtering
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.company_name?.toLowerCase().includes(query) ||
      customer.customer_id?.toLowerCase().includes(query) ||
      customer.industry?.toLowerCase().includes(query)
    );
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Health</h1>
        <p className="text-muted-foreground">
          Monitor customer health and identify at-risk accounts
        </p>
      </div>

      {/* Health Distribution Cards */}
      {healthDist && (
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-colors hover:shadow-md ${
                health === "all" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setHealth("all")}
            >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                Total Active Customers
              </div>
              <div className="text-2xl font-bold">
                {healthDist.total_customers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatCurrency(healthDist.total_mrr * 12, { compact: true })} ARR
              </div>
            </CardContent>
          </Card>
          </motion.div>
          {(["Green", "Yellow", "Red"] as const).map((healthCategory) => {
            const data = healthDist.distribution[healthCategory];
            return (
              <motion.div
                key={healthCategory}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-colors ${
                    health === healthCategory ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setHealth(health === healthCategory ? "all" : healthCategory)
                  }
                >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={
                        healthCategory === "Green"
                          ? "success"
                          : healthCategory === "Yellow"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {healthCategory}
                    </Badge>
                    <span className="text-2xl font-bold">{data.count}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(data.mrr * 12, { compact: true })} ARR
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Churned">Churned</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companySize} onValueChange={setCompanySize}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Company Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="SMB">SMB</SelectItem>
                <SelectItem value="Mid-Market">Mid-Market</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCustomersCSV(filteredCustomers, 'customers.csv')}
              disabled={filteredCustomers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <div className="text-sm text-muted-foreground">
              Showing {filteredCustomers.length} of {total} customers
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("company_name")}
                >
                  <div className="flex items-center gap-1">
                    Company
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("company_size")}
                >
                  <div className="flex items-center gap-1">
                    Segment
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("health_score")}
                >
                  <div className="flex items-center gap-1">
                    Health
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer"
                  onClick={() => handleSort("churn_probability")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Churn Risk
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer"
                  onClick={() => handleSort("current_mrr")}
                >
                  <div className="flex items-center justify-end gap-1">
                    MRR
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer"
                  onClick={() => handleSort("tenure_days")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Tenure
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer"
                  onClick={() => handleSort("nps_score")}
                >
                  <div className="flex items-center justify-end gap-1">
                    NPS
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.customer_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="cursor-pointer hover:bg-muted/50 border-b transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.company_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.industry}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.company_size}</Badge>
                    </TableCell>
                    <TableCell>
                      {customer.health_score ? (
                        <Badge
                          variant={
                            customer.health_score === "Green"
                              ? "success"
                              : customer.health_score === "Yellow"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {customer.health_score}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.churn_probability !== null ? (
                        <div className="space-y-1">
                          <div
                            className={`font-medium ${getChurnColor(
                              customer.churn_probability
                            )}`}
                          >
                            {formatPercent(customer.churn_probability)}
                          </div>
                          <Progress
                            value={customer.churn_probability * 100}
                            className={`h-1 ${
                              customer.churn_probability >= 0.5
                                ? "[&>div]:bg-red-500"
                                : customer.churn_probability >= 0.3
                                ? "[&>div]:bg-yellow-500"
                                : "[&>div]:bg-green-500"
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(customer.current_mrr)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDays(customer.tenure_days)}
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.nps_score !== null ? (
                        <span
                          className={
                            customer.nps_score >= 9
                              ? "text-green-600"
                              : customer.nps_score >= 7
                              ? "text-yellow-600"
                              : "text-red-600"
                          }
                        >
                          {customer.nps_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog
        open={selectedCustomer !== null}
        onOpenChange={() => setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedCustomer.company_name}</span>
                  <Badge
                    variant={
                      selectedCustomer.health_score === "Green"
                        ? "success"
                        : selectedCustomer.health_score === "Yellow"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {selectedCustomer.health_score} Health
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedCustomer.industry} • {selectedCustomer.company_size}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Monthly Revenue
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedCustomer.current_mrr)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      Tenure
                    </div>
                    <div className="text-xl font-bold">
                      {formatDays(selectedCustomer.tenure_days)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <BarChart3 className="h-4 w-4" />
                      NPS Score
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        (selectedCustomer.nps_score || 0) >= 9
                          ? "text-green-600"
                          : (selectedCustomer.nps_score || 0) >= 7
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedCustomer.nps_score || "—"}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingDown className="h-4 w-4" />
                      Churn Risk
                    </div>
                    <div
                      className={`text-xl font-bold ${getChurnColor(
                        selectedCustomer.churn_probability || 0
                      )}`}
                    >
                      {formatPercent(selectedCustomer.churn_probability || 0)}
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                {selectedCustomer.churn_probability &&
                  selectedCustomer.churn_probability >= 0.5 && (
                    <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 dark:text-red-400">
                            High Churn Risk - Immediate Action Required
                          </h4>
                          <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                            This customer has a{" "}
                            {formatPercent(selectedCustomer.churn_probability)}{" "}
                            probability of churning within the next 90 days.
                            Priority intervention needed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* AI-Powered Customer Insights */}
                <CustomerInsights
                  customerId={selectedCustomer.customer_id}
                  customerName={selectedCustomer.company_name}
                />

                {/* Health Factors */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Health Score Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Usage Activity</span>
                        <span className="text-sm font-bold text-green-600">
                          {selectedCustomer.health_score === "Green"
                            ? "High"
                            : selectedCustomer.health_score === "Yellow"
                            ? "Medium"
                            : "Low"}
                        </span>
                      </div>
                      <Progress
                        value={
                          selectedCustomer.health_score === "Green"
                            ? 85
                            : selectedCustomer.health_score === "Yellow"
                            ? 60
                            : 30
                        }
                        className={`h-2 ${
                          selectedCustomer.health_score === "Green"
                            ? "[&>div]:bg-green-500"
                            : selectedCustomer.health_score === "Yellow"
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Engagement</span>
                        <span className="text-sm font-bold text-green-600">
                          {selectedCustomer.health_score === "Green"
                            ? "Strong"
                            : selectedCustomer.health_score === "Yellow"
                            ? "Moderate"
                            : "Weak"}
                        </span>
                      </div>
                      <Progress
                        value={
                          selectedCustomer.health_score === "Green"
                            ? 80
                            : selectedCustomer.health_score === "Yellow"
                            ? 55
                            : 25
                        }
                        className={`h-2 ${
                          selectedCustomer.health_score === "Green"
                            ? "[&>div]:bg-green-500"
                            : selectedCustomer.health_score === "Yellow"
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sentiment</span>
                        <span className="text-sm font-bold text-green-600">
                          {(selectedCustomer.nps_score || 0) >= 9
                            ? "Positive"
                            : (selectedCustomer.nps_score || 0) >= 7
                            ? "Neutral"
                            : "Negative"}
                        </span>
                      </div>
                      <Progress
                        value={
                          (selectedCustomer.nps_score || 0) >= 9
                            ? 90
                            : (selectedCustomer.nps_score || 0) >= 7
                            ? 70
                            : 40
                        }
                        className={`h-2 ${
                          (selectedCustomer.nps_score || 0) >= 9
                            ? "[&>div]:bg-green-500"
                            : (selectedCustomer.nps_score || 0) >= 7
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Financial Health</span>
                        <span className="text-sm font-bold text-green-600">
                          {selectedCustomer.current_mrr >= 5000
                            ? "Strong"
                            : selectedCustomer.current_mrr >= 2000
                            ? "Good"
                            : "Fair"}
                        </span>
                      </div>
                      <Progress
                        value={
                          selectedCustomer.current_mrr >= 5000
                            ? 85
                            : selectedCustomer.current_mrr >= 2000
                            ? 65
                            : 45
                        }
                        className="h-2 [&>div]:bg-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Actions</h4>
                  <div className="space-y-2">
                    {selectedCustomer.churn_probability &&
                    selectedCustomer.churn_probability >= 0.5 ? (
                      <>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                            1
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              Schedule Executive Business Review (EBR)
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Set up a meeting within 7 days to understand pain
                              points and demonstrate ROI
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                            2
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              Analyze Usage Patterns
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Review feature adoption and identify unused
                              capabilities that could drive value
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                            3
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              Provide Additional Training
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Offer personalized onboarding sessions or advanced
                              training workshops
                            </div>
                          </div>
                        </div>
                      </>
                    ) : selectedCustomer.health_score === "Yellow" ? (
                      <>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">
                              Monitor Engagement Trends
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Track weekly usage metrics and set up alerts for
                              declining activity
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">
                              Share Best Practices
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Send case studies and success stories from similar
                              companies
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">
                              Identify Expansion Opportunities
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Customer is healthy - explore upsell and cross-sell
                              options
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">Request Case Study</div>
                            <div className="text-sm text-muted-foreground">
                              Capture success story for marketing and sales
                              enablement
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Assigning ${selectedCustomer.company_name} to CSM team...`);
                    }}
                  >
                    Assign to CSM
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Opening full profile for ${selectedCustomer.company_name}...`);
                    }}
                  >
                    View Full Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
