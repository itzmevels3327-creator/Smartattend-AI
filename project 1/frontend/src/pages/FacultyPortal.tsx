import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Select, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from "../components/ui";
import { ArrowLeft, Check, X, ShieldAlert, Award, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FacultyPortal: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"MANUAL_ROLL" | "LEAVE_APPROVALS">("MANUAL_ROLL");

  // Selection configurations
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Students & Leaves lists
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [rollRecords, setRollRecords] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const clsRes = await api.get("/users/classes");
        setClasses(clsRes.data);
        if (clsRes.data.length > 0) setSelectedClass(clsRes.data[0].id);

        const subRes = await api.get("/users/subjects");
        setSubjects(subRes.data);
        if (subRes.data.length > 0) setSelectedSubject(subRes.data[0].id);

        // Fetch leaves
        const leavesRes = await api.get("/leaves");
        setLeaves(leavesRes.data);
      } catch (err) {
        console.error("Failed to load configs.", err);
      }
    };
    fetchConfig();
  }, [api]);

  // Fetch student roster when Class changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchClassRoster = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users/students");
        // Filter student profile lists belonging to this class
        const filtered = res.data.filter((s: any) => s.classId === selectedClass);
        setClassStudents(filtered);
        
        // Initialize default roster state
        const initialRolls: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
        filtered.forEach((s: any) => {
          initialRolls[s.id] = "PRESENT";
        });
        setRollRecords(initialRolls);
      } catch (err) {
        console.error("Roster query failed.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassRoster();
  }, [selectedClass, api]);

  const toggleStudentStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setRollRecords((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitManualRoster = async () => {
    setLoading(true);
    try {
      const recordsPayload = Object.keys(rollRecords).map((sid) => ({
        studentId: sid,
        status: rollRecords[sid]
      }));

      await api.post("/attendance/mark-manual", {
        date: selectedDate,
        subjectId: selectedSubject,
        classId: selectedClass,
        records: recordsPayload
      });

      alert("Roster submitted successfully.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Roster submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId: string, decision: "APPROVED" | "REJECTED") => {
    try {
      await api.post(`/leaves/${leaveId}/approve`, { status: decision });
      // Reload leaves
      const leavesRes = await api.get("/leaves");
      setLeaves(leavesRes.data);
      alert(`Leave request has been ${decision.toLowerCase()}.`);
    } catch (err: any) {
      alert("Failed to update leave request.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Faculty Workspace</h1>
              <p className="text-muted-foreground text-sm">
                Mark roll calls, review leave applications, and view subject metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-2 pb-px">
          <Button
            variant={activeTab === "MANUAL_ROLL" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("MANUAL_ROLL")}
          >
            Manual Roster Sheet
          </Button>
          <Button
            variant={activeTab === "LEAVE_APPROVALS" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("LEAVE_APPROVALS")}
            className="flex gap-2"
          >
            Leave Requests Review
            {leaves.filter(l => l.status === "PENDING").length > 0 && (
              <Badge variant="danger" className="py-0 px-1.5 text-[10px]">
                {leaves.filter(l => l.status === "PENDING").length}
              </Badge>
            )}
          </Button>
        </div>

        {activeTab === "MANUAL_ROLL" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sheet Configurations */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Roster Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Select Date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Select Class Group</label>
                    <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Select Subject</label>
                    <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Roster students grid list */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex justify-between items-center">
                    Student Attendance Sheet
                    <Badge variant="secondary">{classStudents.length} Students Listed</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
                      Updating roster sheets...
                    </div>
                  ) : classStudents.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead className="text-right">Attendance Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classStudents.map((stud) => {
                            const curStatus = rollRecords[stud.id] || "PRESENT";
                            return (
                              <TableRow key={stud.id}>
                                <TableCell className="font-bold text-xs">{stud.user.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{stud.rollNumber}</TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex gap-1.5 bg-secondary p-1 rounded-lg">
                                    <Button
                                      size="sm"
                                      variant={curStatus === "PRESENT" ? "primary" : "ghost"}
                                      className="h-7 text-[10px] py-1 px-2.5 font-bold"
                                      onClick={() => toggleStudentStatus(stud.id, "PRESENT")}
                                    >
                                      Present
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={curStatus === "ABSENT" ? "destructive" : "ghost"}
                                      className="h-7 text-[10px] py-1 px-2.5 font-bold"
                                      onClick={() => toggleStudentStatus(stud.id, "ABSENT")}
                                    >
                                      Absent
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={curStatus === "LATE" ? "glass" : "ghost"}
                                      className="h-7 text-[10px] py-1 px-2.5 font-bold border-border"
                                      onClick={() => toggleStudentStatus(stud.id, "LATE")}
                                    >
                                      Late
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <Button onClick={submitManualRoster} className="w-full font-bold">
                        Save and Submit Attendance
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      No student profiles assigned to this Class Batch. Add students via Admin panel.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {activeTab === "LEAVE_APPROVALS" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leave Request Inbox</CardTitle>
              <CardDescription>Approve or deny submitted student leave configurations</CardDescription>
            </CardHeader>
            <CardContent>
              {leaves.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <p className="font-bold text-xs">{l.student.user.name}</p>
                          <p className="text-[10px] text-muted-foreground">Roll: {l.student.rollNumber}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {l.startDate} to {l.endDate}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{l.reason}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "PENDING" ? "warning" : l.status === "APPROVED" ? "success" : "danger"}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {l.status === "PENDING" ? (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600"
                                onClick={() => handleApproveLeave(l.id, "APPROVED")}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                                onClick={() => handleApproveLeave(l.id, "REJECTED")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">Reviewed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Award className="w-8 h-8 text-indigo-500" />
                  No leave requests found in inbox.
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};
export default FacultyPortal;
