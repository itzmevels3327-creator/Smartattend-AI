import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from "../components/ui";
import {
  Users,
  CalendarCheck,
  Percent,
  TrendingUp,
  BrainCircuit,
  Bell,
  Clock,
  ArrowRight,
  LogOut,
  Sun,
  Moon,
  Camera,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  summary: {
    totalStudents: number;
    totalFaculty: number;
    presentToday: number;
    absentToday: number;
    attendanceRate: number;
    aiAccuracy: number;
  };
  weeklyChart: Array<{ day: string; date: string; rate: number }>;
  recentActivities: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user?: { name: string; role: string };
  }>;
  aiRiskStats: { lowRisk: number; medRisk: number; highRisk: number };
  alerts: Array<{
    studentName: string;
    rollNumber: string;
    attendanceRate: number;
    riskLevel: string;
    probability: number;
    insights: string[];
  }>;
}

export const Dashboard: React.FC = () => {
  const { user, logout, theme, toggleTheme, api, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const downloadReport = async (type: "pdf" | "excel") => {
    try {
      const ext = type === "pdf" ? "pdf" : "xlsx";
      const mimeType = type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const res = await api.get(`/attendance/reports/${type}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_report.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to download ${type} report`, err);
      alert(`Failed to download ${type.toUpperCase()} report. Please try again.`);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/attendance/analytics");
        setData(res.data);
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [api]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-semibold tracking-wide animate-pulse">Loading dashboard insights...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalStudents: 0,
    totalFaculty: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 85,
    aiAccuracy: 96.4,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-card/75 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-extrabold text-white text-sm">SA</span>
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            SmartAttend
          </span>
          <span className="text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider rounded bg-primary/10 text-primary">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {user?.role}
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          <Button variant="outline" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {user?.name}. Here is the live status report of today.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {user?.role === "STUDENT" ? (
              <Button onClick={() => navigate("/camera")} className="flex gap-2">
                <Camera className="w-4 h-4" /> Mark Face Attendance
              </Button>
            ) : user?.role === "FACULTY" ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/faculty")} className="flex gap-2">
                  <FolderOpen className="w-4 h-4" /> Faculty Portal
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/admin")} className="flex gap-2">
                  <UserCheck className="w-4 h-4" /> Admin Console
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {user?.role === "STUDENT" ? "My Academic Program" : "Total Enrollment"}
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.role === "STUDENT" ? "B.Tech CSE" : summary.totalStudents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.role === "STUDENT" ? "Semester 5 (Active)" : `${summary.totalFaculty} active faculty members`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance Percentage
              </CardTitle>
              <Percent className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg. historical attendance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Marked Present Today
              </CardTitle>
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{summary.presentToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.absentToday} marked absent today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Match Accuracy
              </CardTitle>
              <BrainCircuit className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-500">{summary.aiAccuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Facial validation confidence
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight Box (Warning alerts for students at risk) */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">
                  {user?.role === "STUDENT" ? "AI Low Attendance Warning Alert" : "AI Predicted Low Attendance Warnings"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.role === "STUDENT"
                    ? `Your current attendance is close to/below 75%. AI Risk Probability: ${Math.round(data.alerts[0].probability * 100)}%`
                    : `System flagged ${data.alerts.length} student(s) at high risk of falling below the 75% threshold.`}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto shrink-0 space-y-1">
              {data.alerts.map((alert, index) => (
                <div key={index} className="text-xs font-semibold flex items-center gap-2">
                  <Badge variant={alert.riskLevel === "HIGH" ? "danger" : "warning"}>{alert.riskLevel} RISK</Badge>
                  <span>{alert.studentName} ({alert.attendanceRate}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts & Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recharts Analytics Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Average weekly attendance percentages</CardDescription>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +2.1% this week
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.weeklyChart || []} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[40, 100]} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#1e293b" : "#ffffff",
                      borderColor: theme === "dark" ? "#334155" : "#e2e8f0",
                      borderRadius: "8px",
                      color: theme === "dark" ? "#ffffff" : "#000000",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity Log */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Log of recent system actions</CardDescription>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                data.recentActivities.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start text-xs border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 uppercase">
                      {act.action.slice(0, 2)}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold">{act.details}</p>
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <span>{act.user?.name || "System"}</span>
                        <span>•</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-10">No activities recorded.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1">Face Scanner Mode</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Mark attendance instantly using live face detection scan.
              </p>
              <Button variant="outline" className="w-full flex justify-between group" onClick={() => navigate("/camera")}>
                Start Scanner
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1">Leaves Workspace</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Apply for leave of absence or review pending applications.
              </p>
              <Button
                variant="outline"
                className="w-full flex justify-between group"
                onClick={() => navigate(user?.role === "STUDENT" ? "/student" : "/faculty")}
              >
                Open Leaves Portal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1">Generate Reports</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Export class-wise, subject-wise attendance logs in PDF/Excel format.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => downloadReport("pdf")}
                >
                  PDF Log
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => downloadReport("excel")}
                >
                  Excel Spreadsheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
