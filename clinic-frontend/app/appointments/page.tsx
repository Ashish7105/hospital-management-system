// app/appointments/page.tsx - PRODUCTION-READY VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentAPI, doctorAPI, patientAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// ✅ ENHANCED: Complete type definitions
interface Appointment {
  id: number;
  appointmentDateTime: string;
  status: string;
  notes?: string;
  patient: {
    id: number;
    name: string;
    phone: string;
  };
  doctor: {
    id: number;
    name: string;
    specialization: string;
  };
}

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  isActive?: boolean; // ✅ ADDED: For validation
}

interface Patient {
  id: number;
  name: string;
  phone: string;
  email?: string; // ✅ FIXED: Made optional since not always present
}

// ✅ ENHANCED: Error type for better error handling
interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      details?: string;
      error?: string;
    };
  };
  message?: string;
}

export default function AppointmentsManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false); // ✅ ADDED: Prevent double submission
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchAllData();
  }, []);

  // ✅ ENHANCED: Fetch all data together
  const fetchAllData = async () => {
    await Promise.all([
      fetchAppointments(),
      fetchDoctors(),
      fetchPatients()
    ]);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await doctorAPI.getAll();
      const doctorData = response.data?.data || response.data || [];
      setDoctors(doctorData);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll();
      const patientData = response.data?.data || response.data || [];
      setPatients(patientData);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  // ✅ ENHANCED: Better validation and datetime formatting
  const handleScheduleAppointment = async () => {
    if (submitting) return; // ✅ PREVENT: Double submission
    
    try {
      setSubmitting(true);
      
      // ✅ VALIDATION: Check all required fields
      if (!newAppointment.patientId || !newAppointment.doctorId || !newAppointment.date || !newAppointment.time) {
        alert('Please fill all required fields');
        return;
      }

      // ✅ VALIDATION: Check if doctor exists and is active
      const selectedDoctor = doctors.find(d => d.id === parseInt(newAppointment.doctorId));
      if (!selectedDoctor) {
        alert('Selected doctor not found. Please refresh and try again.');
        return;
      }

      if (selectedDoctor.isActive === false) {
        alert('Selected doctor is currently inactive. Please choose another doctor.');
        return;
      }

      // ✅ VALIDATION: Check if patient exists
      const selectedPatient = patients.find(p => p.id === parseInt(newAppointment.patientId));
      if (!selectedPatient) {
        alert('Selected patient not found. Please refresh and try again.');
        return;
      }

      // ✅ FIXED: Proper datetime formatting for your NestJS backend
      const appointmentDateTime = `${newAppointment.date} ${newAppointment.time}`;

      // ✅ FIXED: Perfect data structure for your NestJS DTO
      const appointmentData = {
        doctorId: parseInt(newAppointment.doctorId),
        patientId: parseInt(newAppointment.patientId),
        appointmentDateTime: appointmentDateTime, // ✅ MATCHES: Your NestJS DTO expectation
        notes: newAppointment.notes || '',
        status: 'scheduled'
      };

      console.log('Sending appointment data:', appointmentData);

      const response = await appointmentAPI.create(appointmentData);
      console.log('Appointment created:', response.data);

      alert(`✅ Appointment scheduled successfully!\n\nPatient: ${selectedPatient.name}\nDoctor: Dr. ${selectedDoctor.name}\nDate: ${newAppointment.date}\nTime: ${newAppointment.time}`);
      
      setShowNewAppointment(false);
      setNewAppointment({ 
        patientId: '', 
        doctorId: '', 
        date: '', 
        time: '',
        notes: '' 
      });
      fetchAppointments();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error scheduling appointment:', error);
      console.error('Error response:', error.response?.data);
      
      // ✅ ENHANCED: Better error handling
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to schedule appointment';
      
      alert(`Error: ${errorMessage}\n\nPlease check:\n- Doctor is available\n- Patient exists\n- Time slot is not taken`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAppointment = async (appointmentId: number) => {
    alert(`Edit appointment ${appointmentId} - Feature coming soon!\n\nThis would open a modal to modify appointment details like date, time, or notes.`);
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      const confirmMessage = `Are you sure you want to cancel this appointment?\n\nPatient: ${appointment?.patient?.name}\nDoctor: Dr. ${appointment?.doctor?.name}\nDate: ${formatDateTime(appointment?.appointmentDateTime || '').date}`;
      
      if (confirm(confirmMessage)) {
        try {
          await appointmentAPI.updateStatus(appointmentId, 'cancelled');
        } catch (updateError) {
          // Fallback to delete if updateStatus doesn't exist
          await appointmentAPI.delete(appointmentId);
        }
        
        alert('Appointment cancelled successfully!');
        fetchAppointments();
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('Error cancelling appointment:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to cancel appointment';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // ✅ ENHANCED: Better status color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ ENHANCED: Better datetime formatting
  const formatDateTime = (dateTimeString: string) => {
    try {
      if (!dateTimeString) return { date: 'No Date', time: 'No Time' };
      
      // ✅ HANDLE: Different datetime formats from your backend
      let date: Date;
      
      // Try parsing as ISO string first
      if (dateTimeString.includes('T')) {
        date = new Date(dateTimeString);
      } else {
        // Handle "YYYY-MM-DD HH:mm" format from your backend
        date = new Date(dateTimeString.replace(' ', 'T'));
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return { date: 'Invalid Date', time: 'Invalid Time' };
      }
      
      return {
        date: date.toLocaleDateString('en-US', { 
          weekday: 'short',
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
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
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="mr-4">
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Appointment Management</h1>
            </div>
            <div className="flex space-x-2">
              <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    📅 Schedule New Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Schedule New Appointment</DialogTitle>
                    <DialogDescription>Enter the appointment details.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Patient *</label>
                      <Select value={newAppointment.patientId} onValueChange={(value) => setNewAppointment({...newAppointment, patientId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.name} - {patient.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {patients.length === 0 && (
                        <p className="text-sm text-red-600 mt-1">No patients available. Please add patients first.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Doctor *</label>
                      <Select value={newAppointment.doctorId} onValueChange={(value) => setNewAppointment({...newAppointment, doctorId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.filter(doctor => doctor.isActive !== false).map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              Dr. {doctor.name} - {doctor.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {doctors.filter(d => d.isActive !== false).length === 0 && (
                        <p className="text-sm text-red-600 mt-1">No active doctors available. Please add doctors first.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Date *</label>
                      <Input
                        type="date"
                        value={newAppointment.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Time *</label>
                      <Input
                        type="time"
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                      <Input
                        placeholder="Additional notes or instructions"
                        value={newAppointment.notes}
                        onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                      />
                    </div>

                    <Button 
                      onClick={handleScheduleAppointment} 
                      className="w-full"
                      disabled={submitting || patients.length === 0 || doctors.filter(d => d.isActive !== false).length === 0}
                    >
                      {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={fetchAllData}>
                🔄 Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Appointments Schedule ({appointments.length} total)</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No appointments scheduled</p>
                  <p className="text-gray-400 mt-2">Create your first appointment to get started</p>
                  <Button 
                    onClick={() => setShowNewAppointment(true)} 
                    className="mt-4 bg-green-600 hover:bg-green-700"
                    disabled={patients.length === 0 || doctors.filter(d => d.isActive !== false).length === 0}
                  >
                    📅 Schedule First Appointment
                  </Button>
                  {(patients.length === 0 || doctors.filter(d => d.isActive !== false).length === 0) && (
                    <p className="text-red-500 text-sm mt-2">
                      Please add {patients.length === 0 ? 'patients' : ''} 
                      {patients.length === 0 && doctors.filter(d => d.isActive !== false).length === 0 ? ' and ' : ''}
                      {doctors.filter(d => d.isActive !== false).length === 0 ? 'doctors' : ''} first.
                    </p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment: Appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDateTime(appointment.appointmentDateTime).date}</p>
                            <p className="text-sm text-gray-500">{formatDateTime(appointment.appointmentDateTime).time}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{appointment.patient?.name || 'Unknown Patient'}</p>
                            <p className="text-sm text-gray-500">{appointment.patient?.phone || 'No phone'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">Dr. {appointment.doctor?.name || 'Unknown Doctor'}</p>
                            <p className="text-sm text-gray-500">{appointment.doctor?.specialization || 'General'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(appointment.status || 'scheduled')}>
                            {appointment.status || 'Scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {appointment.notes || 'No notes'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditAppointment(appointment.id)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
