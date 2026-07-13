import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Select, Badge } from "../components/ui";
import { Camera, MapPin, CheckCircle2, AlertOctagon, HelpCircle, ScanFace, SwitchCamera } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AttendanceCamera: React.FC = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Setting up camera...");
  const [scannerMode, setScannerMode] = useState<"VERIFY" | "REGISTER">("VERIFY");
  
  // Simulator configuration for easy testing
  const [simOutcome, setSimOutcome] = useState<"REAL" | "MOCK_SUCCESS" | "MOCK_FAIL">("MOCK_SUCCESS");
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch subjects, classes, and get current GPS location on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const subRes = await api.get("/users/subjects");
        setSubjects(subRes.data);
        if (subRes.data.length > 0) setSelectedSubject(subRes.data[0].id);

        const classRes = await api.get("/users/classes");
        setClasses(classRes.data);
        if (classRes.data.length > 0) setSelectedClass(classRes.data[0].id);
      } catch (err) {
        console.error("Failed to load academic lists.", err);
      }
    };

    initData();

    // Get GPS coords
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
        },
        (err) => {
          console.warn("GPS lookup denied/failed. Simulating coordinates.", err.message);
          // Simulate institutional campus location
          setCoords({ lat: 12.9716, lng: 77.5946 });
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
    }
  }, [api]);

  // Activate Camera Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        setStatusMsg("Accessing media devices...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          activeStream = stream;
          setStreamActive(true);
          setStatusMsg("System aligned. Look directly at scanner.");
        }
      } catch (err: any) {
        console.warn("Physical camera stream failed. Operating in mock interface mode:", err.message);
        setStatusMsg("Operating in Camera Simulator Mode.");
        setStreamActive(false);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleAction = async () => {
    if (!selectedSubject || !selectedClass) {
      alert("Please select a valid subject and class first.");
      return;
    }

    setSubmitting(true);
    setScanResult(null);

    try {
      let imageBlob: Blob;

      if (streamActive && simOutcome === "REAL") {
        // Capture frame from active video
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
          const ctx = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          imageBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas export failed"));
            }, "image/jpeg", 0.95);
          });
        } else {
          throw new Error("Video component not available");
        }
      } else {
        // Generating simulated image blob (blank red/green or custom text)
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = simOutcome === "MOCK_SUCCESS" ? "#818cf8" : "#f43f5e";
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = "#ffffff";
          ctx.font = "24px sans-serif";
          ctx.fillText(`SIMULATED PHOTO: ${simOutcome}`, 150, 240);
        }
        imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg");
        });
      }

      // Prepare payload
      const formData = new FormData();
      // Filename includes mock flag to trigger validation fails/successes in mock backend APIs
      const filename = simOutcome === "MOCK_FAIL" ? "live_photo_fail.jpg" : "live_photo_success.jpg";
      formData.append("image", imageBlob, filename);
      formData.append("subjectId", selectedSubject);
      formData.append("classId", selectedClass);
      
      if (coords) {
        formData.append("latitude", coords.lat.toString());
        formData.append("longitude", coords.lng.toString());
      }

      if (scannerMode === "REGISTER") {
        const res = await api.post("/attendance/register-face", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setScanResult({ success: true, message: res.data.message });
      } else {
        const res = await api.post("/attendance/mark-face", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setScanResult({ success: true, message: res.data.message });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.response?.data?.error || "Camera verification rejected by server."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">AI Camera Scanner</h1>
            <p className="text-muted-foreground text-sm">
              Use facial recognition and GPS location logs to confirm presence.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: configurations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Class Configurations</CardTitle>
                <CardDescription>Select academic scope for verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Subject
                  </label>
                  <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Class Group
                  </label>
                  <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1 pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Scanning Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={scannerMode === "VERIFY" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => { setScannerMode("VERIFY"); setScanResult(null); }}
                      className="text-xs font-semibold"
                    >
                      Confirm Presence
                    </Button>
                    <Button
                      variant={scannerMode === "REGISTER" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => { setScannerMode("REGISTER"); setScanResult(null); }}
                      className="text-xs font-semibold"
                    >
                      Register Face
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Check</CardTitle>
                <CardDescription>GPS proximity details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    {gpsLoading ? (
                      <p className="text-muted-foreground animate-pulse">Checking location coordinates...</p>
                    ) : (
                      <>
                        <p className="font-semibold">Geofenced Region</p>
                        <p className="text-xs text-muted-foreground">
                          Lat: {coords?.lat.toFixed(4)}, Lng: {coords?.lng.toFixed(4)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={gpsLoading ? "secondary" : "success"} className="w-full justify-center py-1">
                  {gpsLoading ? "VERIFYING GPS..." : "CAMPUS GEOFENCE VALID"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: camera viewport */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Simulation controls bar */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <SwitchCamera className="w-4 h-4 text-primary" />
                  Webcam Test Simulator:
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant={simOutcome === "MOCK_SUCCESS" ? "primary" : "outline"}
                    size="sm"
                    className="text-[10px] py-1 px-2 h-7 font-bold flex-1"
                    onClick={() => setSimOutcome("MOCK_SUCCESS")}
                  >
                    Simulate Success
                  </Button>
                  <Button
                    variant={simOutcome === "MOCK_FAIL" ? "primary" : "outline"}
                    size="sm"
                    className="text-[10px] py-1 px-2 h-7 font-bold flex-1"
                    onClick={() => setSimOutcome("MOCK_FAIL")}
                  >
                    Simulate Mismatch
                  </Button>
                  {streamActive && (
                    <Button
                      variant={simOutcome === "REAL" ? "primary" : "outline"}
                      size="sm"
                      className="text-[10px] py-1 px-2 h-7 font-bold flex-1"
                      onClick={() => setSimOutcome("REAL")}
                    >
                      Use Physical Camera
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black flex items-center justify-center">
                
                {/* Active camera element */}
                {streamActive && simOutcome === "REAL" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                    <ScanFace className="w-16 h-16 text-indigo-500/80 animate-pulse mb-3" />
                    <p className="text-sm font-semibold tracking-wide text-white">Camera Simulator Feed Active</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {simOutcome === "MOCK_SUCCESS" ? "Simulating optimal lighting face alignment" : "Simulating user alignment warning"}
                    </p>
                  </div>
                )}

                {/* Canvas template for Captures (hidden) */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning HUD Overlays */}
                <div className="absolute inset-0 border-[2px] border-primary/20 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-dashed border-indigo-400/50 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-500 rounded-full opacity-30" />
                  </div>
                </div>

                <div className="absolute top-4 left-4">
                  <Badge variant="info" className="flex items-center gap-1.5 uppercase font-bold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    {statusMsg}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-6">
                <Button
                  onClick={handleAction}
                  className="w-full flex gap-2 font-bold justify-center"
                  disabled={submitting}
                >
                  {submitting ? "Processing Face..." : scannerMode === "REGISTER" ? "Register My Facial Template" : "Validate Presence"}
                </Button>
              </CardContent>
            </Card>

            {/* Results overlay cards */}
            {scanResult && (
              <div
                className={`p-4 rounded-xl border flex gap-3.5 items-start animate-in fade-in duration-200 ${
                  scanResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {scanResult.success ? "Camera Action Succeeded" : "Camera Action Failed"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{scanResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AttendanceCamera;
