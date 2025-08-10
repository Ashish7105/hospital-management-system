// app/dashboard/page.tsx - TYPESCRIPT ERROR FIXED
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { queueAPI, appointmentAPI, patientAPI } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ✅ FIXED: Add proper priority type definition
type PriorityLevel = 'normal' | 'urgent' | 'emergency';

// ✅ ENHANCED: Complete interfaces with proper typing
interface DashboardStats {
  totalWaiting: number;
  emergencyCases: number;
  urgentCases: number;
  longestWait: string;
  totalAppointments: number;
  todayAppointments: number;
}

interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  age?: number;
  gender?: string;
}

interface Appointment {
  id: number;
  appointmentDateTime: string;
  status: string;
  notes?: string;
  patient?: {
    id: number;
    name: string;
    phone: string;
  };
  doctor?: {
    id: number;
    name: string;
    specialization: string;
  };
}

interface QueueItem {
  id: number;
  queueNumber: number;
  status: string;
  priority: PriorityLevel; // ✅ FIXED: Use specific type
  createdAt: string;
  patient?: {
    id: number;
    name: string;
    phone: string;
  };
}

// ✅ ENHANCED: Better error typing
interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      details?: string;
      error?: string;
    };
    statusText?: string;
  };
  message?: string;
  code?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPatientListModal, setShowPatientListModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedEmergencyPatient, setSelectedEmergencyPatient] = useState<Patient | null>(null);
  
  // ✅ FIXED: Use proper priority type
  const [bookingForm, setBookingForm] = useState<{
    patientId: string;
    priority: PriorityLevel;
    notes: string;
  }>({
    patientId: '',
    priority: 'normal', // ✅ FIXED: Explicit type
    notes: ''
  });
  
  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchDashboardData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchStats(),
      fetchPatients(),
      fetchAppointments()
    ]);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const queueResponse = await queueAPI.getAll();
      const queueData = queueResponse.data?.data || queueResponse.data || [];
      setQueueItems(queueData);
      
      const waitingQueue = queueData.filter((item: QueueItem) => item.status === 'waiting');
      const emergencyCases = queueData.filter((item: QueueItem) => item.priority === 'emergency');
      const urgentCases = queueData.filter((item: QueueItem) => item.priority === 'urgent');
      
      const longestWait = calculateLongestWait(waitingQueue);
      
      const appointmentResponse = await appointmentAPI.getAll();
      const appointments = appointmentResponse.data?.data || appointmentResponse.data || [];
      
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.appointmentDateTime).toDateString();
        return aptDate === today;
      });

      setStats({
        totalWaiting: waitingQueue.length,
        emergencyCases: emergencyCases.length,
        urgentCases: urgentCases.length,
        longestWait: longestWait,
        totalAppointments: appointments.length,
        todayAppointments: todayAppointments.length
      });
      
      setAppointments(appointments);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching stats:', error);
      
      setStats({
        totalWaiting: 0,
        emergencyCases: 0,
        urgentCases: 0,
        longestWait: '0m',
        totalAppointments: 0,
        todayAppointments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLongestWait = (waitingQueue: QueueItem[]): string => {
    if (waitingQueue.length === 0) return '0m';
    
    const now = new Date();
    let maxWaitMinutes = 0;
    
    waitingQueue.forEach(item => {
      const createdAt = new Date(item.createdAt);
      const waitMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      if (waitMinutes > maxWaitMinutes) {
        maxWaitMinutes = waitMinutes;
      }
    });
    
    if (maxWaitMinutes < 60) {
      return `${maxWaitMinutes}m`;
    } else {
      const hours = Math.floor(maxWaitMinutes / 60);
      const minutes = maxWaitMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll();
      const patientData = response.data?.data || response.data || [];
      setPatients(patientData);
      console.log('Patients fetched:', patientData.length, 'patients');
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await appointmentAPI.getAll();
      const appointmentData = response.data?.data || response.data || [];
      setAppointments(appointmentData);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  // ✅ FIXED: Type-safe queue creation
  const handleQuickBooking = async () => {
    try {
      if (!bookingForm.patientId) {
        alert('Please select a patient');
        return;
      }

      const queueData: {
        patientId: number;
        priority: PriorityLevel; // ✅ FIXED: Explicit type
        notes?: string;
      } = {
        patientId: parseInt(bookingForm.patientId),
        priority: bookingForm.priority, // ✅ FIXED: Now properly typed
        notes: bookingForm.notes || undefined
      };

      await queueAPI.create(queueData);
      alert('Patient added to queue successfully!');
      setShowBookingModal(false);
      setBookingForm({ patientId: '', priority: 'normal', notes: '' });
      fetchDashboardData();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error booking appointment:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to book appointment';
      
      alert(`Booking Error: ${errorMessage}`);
    }
  };

  const handleAddPatient = async () => {
    try {
      if (!patientForm.name || !patientForm.phone) {
        alert('Name and phone are required');
        return;
      }

      const patientData = {
        name: patientForm.name,
        phone: patientForm.phone,
        email: patientForm.email || undefined,
        age: patientForm.age ? parseInt(patientForm.age) : undefined,
        gender: patientForm.gender || 'Not Specified'
      };

      console.log('Registering patient:', patientData);
      const response = await patientAPI.create(patientData);
      console.log('Patient registration response:', response.data);

      alert(`✅ Patient "${patientData.name}" registered successfully!\n\nPatient ID: ${response.data?.id || 'Generated'}\nPhone: ${patientData.phone}`);
      
      setShowPatientModal(false);
      setPatientForm({ name: '', phone: '', email: '', age: '', gender: '' });
      
      await fetchPatients();
      await fetchDashboardData();
      
      setTimeout(() => {
        setShowPatientListModal(true);
      }, 1000);
      
    } catch (err) {
      const error = err as ApiError;
      console.error('Error adding patient:', error);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to register patient';
      
      alert(`Registration Error: ${errorMessage}`);
    }
  };

  const handleEmergency = async () => {
    if (!patients.length) {
      alert('⚠️ No patients in system!\n\nPlease register a patient first, then try emergency check-in.');
      setShowPatientModal(true);
      return;
    }

    setShowEmergencyModal(true);
  };

  // ✅ FIXED: Type-safe emergency processing
  const handleEmergencySubmit = async () => {
    try {
      if (!selectedEmergencyPatient) {
        alert('Please select a patient for emergency');
        return;
      }

      const emergencyData: {
        patientId: number;
        priority: PriorityLevel; // ✅ FIXED: Explicit type
      } = {
        patientId: selectedEmergencyPatient.id,
        priority: 'emergency' as PriorityLevel // ✅ FIXED: Type assertion
      };
      
      console.log('Processing emergency for:', selectedEmergencyPatient.name);
      
      let response;
      try {
        response = await queueAPI.emergency(emergencyData);
      } catch (emergencyEndpointError) {
        console.log('Emergency endpoint not available, using regular queue creation');
        response = await queueAPI.create(emergencyData);
      }
      
      alert(`🚨 EMERGENCY PRIORITY SET!\n\nPatient: ${selectedEmergencyPatient.name}\nPhone: ${selectedEmergencyPatient.phone}\nStatus: HIGHEST PRIORITY\n\nPatient moved to front of queue!`);
      
      setShowEmergencyModal(false);
      setSelectedEmergencyPatient(null);
      fetchDashboardData();
      
    } catch (err) {
      const error = err as ApiError;
      console.error('Emergency processing error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to process emergency patient';
      
      alert(`Emergency Error: ${errorMessage}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Allo Health - Hospital Management</h1>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowPatientListModal(true)}>
                👥 View Patients ({patients.length})
              </Button>
              <Button variant="outline" onClick={fetchDashboardData}>
                🔄 Refresh
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospital Dashboard</h2>
            <p className="text-gray-600">Manage patient queues, appointments, and registrations efficiently</p>
          </div>

          {/* Quick Actions Bar */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 h-12">
                  📅 Add to Queue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Patient to Queue</DialogTitle>
                  <DialogDescription>Add a patient to the waiting queue</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Patient</label>
                    <Select value={bookingForm.patientId} onValueChange={(value) => setBookingForm({...bookingForm, patientId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name} - {patient.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    {/* ✅ FIXED: Type-safe priority selection */}
                    <Select 
                      value={bookingForm.priority} 
                      onValueChange={(value: PriorityLevel) => setBookingForm({...bookingForm, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">📋 Normal</SelectItem>
                        <SelectItem value="urgent">⚠️ Urgent</SelectItem>
                        <SelectItem value="emergency">🚨 Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleQuickBooking} className="w-full">
                    Add to Queue
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 h-12">
                  👤 Register Patient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New Patient</DialogTitle>
                  <DialogDescription>Add a new patient to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Patient Name *"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
                  />
                  <Input
                    placeholder="Phone Number *"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                  />
                  <Input
                    placeholder="Email (Optional)"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                  />
                  <Input
                    placeholder="Age (Optional)"
                    type="number"
                    value={patientForm.age}
                    onChange={(e) => setPatientForm({...patientForm, age: e.target.value})}
                  />
                  <Select value={patientForm.gender} onValueChange={(value) => setPatientForm({...patientForm, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Not Specified">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddPatient} className="w-full">
                    Register Patient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleEmergency} className="bg-red-600 hover:bg-red-700 h-12">
              🆘 Emergency Patient
            </Button>

            <Button onClick={() => router.push('/queue')} className="bg-blue-600 hover:bg-blue-700 h-12">
              📋 View Queue
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Waiting</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalWaiting || 0}</div>
                <p className="text-xs text-muted-foreground">Patients in queue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emergency Cases</CardTitle>
                <Badge variant="destructive" className="text-xs">🆘</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.emergencyCases || 0}</div>
                <p className="text-xs text-muted-foreground">Highest priority</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
                <Badge variant="secondary" className="text-xs">🚨</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats?.urgentCases || 0}</div>
                <p className="text-xs text-muted-foreground">High priority</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats?.todayAppointments || 0}</div>
                <p className="text-xs text-muted-foreground">Scheduled today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Wait</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.longestWait || '0m'}</div>
                <p className="text-xs text-muted-foreground">Current wait time</p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/queue')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Queue Management
                </CardTitle>
                <CardDescription>
                  View and manage patient queues with wait times and priorities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/appointments')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointments
                </CardTitle>
                <CardDescription>
                  Book, reschedule, or cancel patient appointments
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/doctors')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Doctor Management
                </CardTitle>
                <CardDescription>
                  Manage doctor profiles, schedules, and availability
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>

      {/* Emergency Patient Selection Modal */}
      <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">🚨 EMERGENCY PATIENT SELECTION</DialogTitle>
            <DialogDescription>
              Select a patient for EMERGENCY priority. This patient will be moved to the front of the queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEmergencyPatient?.id === patient.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                    }`}
                    onClick={() => setSelectedEmergencyPatient(patient)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">ID: {patient.id} - {patient.name}</p>
                        <p className="text-sm text-gray-600">📞 {patient.phone}</p>
                        {patient.age && <p className="text-sm text-gray-600">Age: {patient.age}</p>}
                      </div>
                      {selectedEmergencyPatient?.id === patient.id && (
                        <div className="text-red-600">✅</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleEmergencySubmit} 
                disabled={!selectedEmergencyPatient}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                🆘 SET EMERGENCY PRIORITY
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEmergencyModal(false);
                  setSelectedEmergencyPatient(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient List Verification Modal */}
      <Dialog open={showPatientListModal} onOpenChange={setShowPatientListModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 Patient List - Staff Verification</DialogTitle>
            <DialogDescription>
              Total Registered Patients: {patients.length}
            </DialogDescription>
          </DialogHeader>
          
          {patients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No patients registered yet</p>
              <Button onClick={() => {
                setShowPatientListModal(false);
                setShowPatientModal(true);
              }}>
                Register First Patient
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-mono">#{patient.id}</TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.age || 'N/A'}</TableCell>
                    <TableCell>{patient.gender || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{patient.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedEmergencyPatient(patient);
                          setShowPatientListModal(false);
                          setShowEmergencyModal(true);
                        }}
                      >
                        🚨 Emergency
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
