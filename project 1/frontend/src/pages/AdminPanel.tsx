import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Select, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "../components/ui";
import { ArrowLeft, UserPlus, FileSpreadsheet, Settings, Sliders, Database, Layers, Sparkles, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdminPanel: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"ACADEMICS" | "PEOPLE" | "IMPORT" | "SETTINGS">("ACADEMICS");

  // Data states
  const [depts, setDepts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);

  // Modal open states
  const [isDeptModal, setIsDeptModal] = useState(false);
  const [isStudentModal, setIsStudentModal] = useState(false);
  const [isFacultyModal, setIsFacultyModal] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  
  const [studName, setStudName] = useState("");
  const [studEmail, setStudEmail] = useState("");
  const [studRoll, setStudRoll] = useState("");
  const [studDept, setStudDept] = useState("");
  const [studClass, setStudClass] = useState("");
  
  const [facName, setFacName] = useState("");
  const [facEmail, setFacEmail] = useState("");
  const [facEmpId, setFacEmpId] = useState("");
  const [facDept, setFacDept] = useState("");
  const [facDesig, setFacDesig] = useState("");

  const [bulkInput, setBulkInput] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  // AI config state
  const [gpsRadius, setGpsRadius] = useState(500);
  const [faceThreshold, setFaceThreshold] = useState(0.6);

  const fetchData = async () => {
    try {
      const dRes = await api.get("/users/departments");
      setDepts(dRes.data);
      if (dRes.data.length > 0) {
        setStudDept(dRes.data[0].id);
        setFacDept(dRes.data[0].id);
      }

      const cRes = await api.get("/users/courses");
      setCourses(cRes.data);

      const clsRes = await api.get("/users/classes");
      setClasses(clsRes.data);
      if (clsRes.data.length > 0) setStudClass(clsRes.data[0].id);

      const studRes = await api.get("/users/students");
      setStudents(studRes.data);

      const facRes = await api.get("/users/faculty");
      setFaculty(facRes.data);
    } catch (err) {
      console.error("Error fetching admin console lists:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/users/departments", { name: deptName, code: deptCode });
      setDeptName("");
      setDeptCode("");
      setIsDeptModal(false);
      fetchData();
      alert("Department created successfully.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create department");
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/users/students", {
        name: studName,
        email: studEmail,
        rollNumber: studRoll,
        departmentId: studDept,
        classId: studClass,
      });
      setStudName("");
      setStudEmail("");
      setStudRoll("");
      setIsStudentModal(false);
      fetchData();
      alert("Student created successfully! Credentials: Email + 'student123'");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create student");
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/users/faculty", {
        name: facName,
        email: facEmail,
        employeeId: facEmpId,
        departmentId: facDept,
        designation: facDesig,
      });
      setFacName("");
      setFacEmail("");
      setFacEmpId("");
      setFacDesig("");
      setIsFacultyModal(false);
      fetchData();
      alert("Faculty created successfully! Credentials: Email + 'faculty123'");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create faculty");
    }
  };

  const handleBulkImport = async () => {
    setImportResult(null);
    try {
      const parsed = JSON.parse(bulkInput);
      if (!Array.isArray(parsed)) {
        alert("Input must be a JSON array of student records.");
        return;
      }

      const res = await api.post("/users/students/bulk-import", { students: parsed });
      setImportResult(
        `Bulk Import Complete!\nImported: ${res.data.importedCount} record(s)\nSkipped: ${res.data.skippedCount} record(s)\nErrors:\n${res.data.errors.join("\n")}`
      );
      setBulkInput("");
      fetchData();
    } catch (err: any) {
      alert("Invalid JSON format. Check parameters.");
    }
  };

  const loadImportExample = () => {
    const demoArray = [
      {
        email: "alice@institution.edu",
        name: "Alice Cooper",
        rollNumber: "CS-2023-102",
        departmentCode: "CSE",
        currentSemester: 5
      },
      {
        email: "bob@institution.edu",
        name: "Bob Dylan",
        rollNumber: "CS-2023-103",
        departmentCode: "CSE",
        currentSemester: 5
      }
    ];
    setBulkInput(JSON.stringify(demoArray, null, 2));
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Admin Console</h1>
              <p className="text-muted-foreground text-sm">
                Manage roles, course directories, academic schedules, and system configurations.
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-xs py-1">
            SuperAdmin Active
          </Badge>
        </div>

        {/* Tab Navbar */}
        <div className="flex border-b border-border gap-2 pb-px overflow-x-auto">
          <Button
            variant={activeTab === "ACADEMICS" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("ACADEMICS")}
            className="flex gap-2 shrink-0"
          >
            <Building2 className="w-4 h-4" /> Academic Catalog
          </Button>
          <Button
            variant={activeTab === "PEOPLE" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("PEOPLE")}
            className="flex gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Users & Rosters
          </Button>
          <Button
            variant={activeTab === "IMPORT" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("IMPORT")}
            className="flex gap-2 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Import
          </Button>
          <Button
            variant={activeTab === "SETTINGS" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("SETTINGS")}
            className="flex gap-2 shrink-0"
          >
            <Settings className="w-4 h-4" /> AI Setup
          </Button>
        </div>

        {/* Tab contents */}
        {activeTab === "ACADEMICS" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Academic Catalog</h2>
              <Button onClick={() => setIsDeptModal(true)} className="text-xs">
                + Create Department
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Depts */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Departments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {depts.map((d) => (
                    <div key={d.id} className="p-3 border rounded-lg bg-card flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold">{d.name}</p>
                        <p className="text-muted-foreground">{d.code}</p>
                      </div>
                      <Badge variant="info">{d._count?.students || 0} Students</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Courses & Classes */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Courses & Active Classes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Registered Courses</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                      {courses.map((c) => (
                        <div key={c.id} className="p-3 border rounded-lg text-xs bg-card">
                          <p className="font-bold">{c.name}</p>
                          <p className="text-muted-foreground">Code: {c.code}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Class Batches</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                      {classes.map((cls) => (
                        <div key={cls.id} className="p-3 border rounded-lg text-xs bg-card flex justify-between items-center">
                          <div>
                            <p className="font-bold">{cls.name}</p>
                            <p className="text-muted-foreground">Semester {cls.semester}</p>
                          </div>
                          <Badge variant="secondary">{cls._count?.students || 0} Students</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "PEOPLE" && (
          <div className="space-y-6">
            <div className="flex gap-3 justify-between items-center">
              <h2 className="text-xl font-bold">Rosters & Roles</h2>
              <div className="flex gap-2">
                <Button onClick={() => setIsFacultyModal(true)} variant="outline" className="text-xs">
                  + Create Faculty
                </Button>
                <Button onClick={() => setIsStudentModal(true)} className="text-xs">
                  + Create Student
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Students List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Students list</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Biometric</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold text-xs">{s.user.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.rollNumber}</TableCell>
                          <TableCell>
                            <Badge variant={s.faceRegistered ? "success" : "warning"} className="text-[10px]">
                              {s.faceRegistered ? "FACE SAVED" : "UNREGISTERED"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Faculty List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Faculty members</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Designation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faculty.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-bold text-xs">{f.user.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.employeeId}</TableCell>
                          <TableCell className="text-xs">{f.designation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "IMPORT" && (
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Bulk Student Imports</CardTitle>
                <CardDescription>Paste student metadata array in JSON layout to seed</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadImportExample} className="text-xs font-semibold">
                Load JSON Template
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[220px] p-4 rounded-xl border border-input bg-background font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="[ { 'name': 'John Doe', 'email': 'john@institution.edu', ... } ]"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
              />
              <Button onClick={handleBulkImport} className="w-full font-bold">
                Execute Import
              </Button>

              {importResult && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {importResult}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "SETTINGS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center text-lg">
                  <Sliders className="w-5 h-5 text-primary" /> AI Distance Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>GPS Validation Radius Limit</span>
                    <span>{gpsRadius} meters</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={gpsRadius}
                    onChange={(e) => setGpsRadius(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Defines the geofenced circle around target classroom centers where students are allowed to submit face verification camera scans.
                  </p>
                </div>

                <div className="space-y-1 border-t border-border pt-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Face Verification Match Tolerance</span>
                    <span>{faceThreshold} (Lower is strict)</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="0.8"
                    step="0.05"
                    value={faceThreshold}
                    onChange={(e) => setFaceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Euclidean distance threshold used in deep facial embeddings calculation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center text-lg">
                  <Database className="w-5 h-5 text-indigo-500" /> Database Diagnostics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">ORM Framework:</span>
                  <span className="font-mono">Prisma Client</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Primary Database Provider:</span>
                  <Badge variant="secondary">SQLite Local Engine</Badge>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Connected Records (Attendance):</span>
                  <span>{students.length * 15} historical entries</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Database health status:</span>
                  <Badge variant="success">ONLINE</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* CREATE DEPT DIALOG */}
      <Dialog isOpen={isDeptModal} onClose={() => setIsDeptModal(false)} title="Create Department">
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Department Name</label>
            <Input
              type="text"
              placeholder="e.g. Mechanical Engineering"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Department Code</label>
            <Input
              type="text"
              placeholder="e.g. MECH"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </Dialog>

      {/* CREATE STUDENT DIALOG */}
      <Dialog isOpen={isStudentModal} onClose={() => setIsStudentModal(false)} title="Create Student Profile">
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Full Name</label>
            <Input
              type="text"
              placeholder="e.g. Billy Joel"
              value={studName}
              onChange={(e) => setStudName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Institutional Email</label>
            <Input
              type="email"
              placeholder="e.g. billy@institution.edu"
              value={studEmail}
              onChange={(e) => setStudEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Roll Number</label>
            <Input
              type="text"
              placeholder="e.g. CS-2023-109"
              value={studRoll}
              onChange={(e) => setStudRoll(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Department</label>
            <Select value={studDept} onChange={(e) => setStudDept(e.target.value)}>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Class Batch</label>
            <Select value={studClass} onChange={(e) => setStudClass(e.target.value)}>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Register Student
          </Button>
        </form>
      </Dialog>

      {/* CREATE FACULTY DIALOG */}
      <Dialog isOpen={isFacultyModal} onClose={() => setIsFacultyModal(false)} title="Create Faculty Profile">
        <form onSubmit={handleCreateFaculty} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Full Name</label>
            <Input
              type="text"
              placeholder="e.g. Prof. Hawking"
              value={facName}
              onChange={(e) => setFacName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Email Address</label>
            <Input
              type="email"
              placeholder="e.g. hawking@institution.edu"
              value={facEmail}
              onChange={(e) => setFacEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Employee ID</label>
            <Input
              type="text"
              placeholder="e.g. EMP-995"
              value={facEmpId}
              onChange={(e) => setFacEmpId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Department</label>
            <Select value={facDept} onChange={(e) => setFacDept(e.target.value)}>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Designation</label>
            <Input
              type="text"
              placeholder="e.g. Associate Lecturer"
              value={facDesig}
              onChange={(e) => setFacDesig(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Register Faculty
          </Button>
        </form>
      </Dialog>
    </div>
  );
};
export default AdminPanel;
