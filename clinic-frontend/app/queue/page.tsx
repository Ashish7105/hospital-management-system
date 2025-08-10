// app/queue/page.tsx - TYPESCRIPT ERRORS FIXED & PRODUCTION READY
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { queueAPI, patientAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ✅ FIXED: Priority type definition matching API expectations
type PriorityLevel = 'normal' | 'urgent' | 'emergency';
type StatusLevel = 'waiting' | 'with-doctor' | 'completed' | 'cancelled';

// ✅ ENHANCED: Complete type definitions with proper typing
interface Patient {
  id: number;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
}

interface QueueItem {
  id: number;
  queueNumber: number;
  patient?: Patient;
  patientId: number;
  status: StatusLevel; // ✅ FIXED: Use specific type
  priority: PriorityLevel; // ✅ FIXED: Use specific type
  createdAt: string;
  updatedAt?: string;
  // ✅ ADD: Calculated fields for display
  timeInQueue?: string;
  estimatedWaitTime?: string;
  position?: number;
}

interface QueueStats {
  totalWaiting: number;
  emergencyCases: number;
  urgentCases: number;
  longestWait: string;
  averageWaitTime: string;
  nextPatient?: QueueItem;
}

// ✅ ADD: Error handling interface
interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

export default function QueueManagement() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddToQueue, setShowAddToQueue] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  
  // ✅ FIXED: Use proper priority type
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>('normal');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | PriorityLevel>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | StatusLevel>('all');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchAllData();
    
    // ✅ ADD: Auto-refresh every 15 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAllData();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // ✅ ENHANCED: Fetch all necessary data
  const fetchAllData = async () => {
    await Promise.all([
      fetchQueue(),
      fetchPatients(),
      fetchQueueStats()
    ]);
  };

  // ✅ FIXED: Better queue data fetching with fallback
  const fetchQueue = async () => {
    try {
      setLoading(true);
      
      // Try enhanced endpoint first, fallback to basic if not available
      let response;
      try {
        response = await queueAPI.getEnhanced();
      } catch (enhancedError) {
        console.log('Enhanced endpoint not available, using basic queue endpoint');
        response = await queueAPI.getAll();
      }
      
      const queueData = response.data?.data || response.data || [];
      console.log('Queue data fetched:', queueData);
      
      // ✅ ENHANCED: Process and enrich queue data with proper typing
      const processedQueue: QueueItem[] = queueData.map((item: any, index: number) => ({
        id: item.id,
        queueNumber: item.queueNumber || (index + 1),
        patient: item.patient,
        patientId: item.patientId,
        status: (item.status as StatusLevel) || 'waiting',
        priority: (item.priority as PriorityLevel) || 'normal',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt,
        // ✅ ADD: Calculated fields
        timeInQueue: calculateTimeInQueue(item.createdAt || new Date().toISOString()),
        estimatedWaitTime: calculateEstimatedWait(item.priority || 'normal', index),
        position: index + 1
      }));
      
      setQueueItems(processedQueue);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching queue:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      setQueueItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADD: Fetch patients for queue management
  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll();
      const patientData = response.data?.data || response.data || [];
      setPatients(patientData);
      console.log('Patients fetched:', patientData.length);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  // ✅ ADD: Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const waitingQueue = queueItems.filter(item => item.status === 'waiting');
      const emergencyQueue = queueItems.filter(item => item.priority === 'emergency');
      const urgentQueue = queueItems.filter(item => item.priority === 'urgent');
      
      const stats: QueueStats = {
        totalWaiting: waitingQueue.length,
        emergencyCases: emergencyQueue.length,
        urgentCases: urgentQueue.length,
        longestWait: calculateLongestWait(waitingQueue),
        averageWaitTime: calculateAverageWait(waitingQueue),
        nextPatient: waitingQueue[0] || undefined
      };
      
      setQueueStats(stats);
    } catch (error) {
      console.error('Error calculating queue stats:', error);
    }
  };

  // ✅ ENHANCED: Calculate time in queue
  const calculateTimeInQueue = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  // ✅ ADD: Calculate estimated wait time
  const calculateEstimatedWait = (priority: PriorityLevel, position: number): string => {
    const avgConsultationTime = 15; // minutes per patient
    
    let priorityMultiplier = 1;
    if (priority === 'emergency') priorityMultiplier = 0; // Immediate
    if (priority === 'urgent') priorityMultiplier = 0.5;
    
    const estimatedMinutes = Math.max(0, position * avgConsultationTime * priorityMultiplier);
    
    if (estimatedMinutes === 0) return 'Immediate';
    if (estimatedMinutes < 60) return `~${estimatedMinutes}m`;
    
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `~${hours}h ${minutes}m`;
  };

  // ✅ ADD: Calculate longest wait
  const calculateLongestWait = (waitingQueue: QueueItem[]): string => {
    if (waitingQueue.length === 0) return '0m';
    
    const longestWaitItem = waitingQueue.reduce((longest, current) => {
      const currentWait = new Date().getTime() - new Date(current.createdAt).getTime();
      const longestWait = new Date().getTime() - new Date(longest.createdAt).getTime();
      return currentWait > longestWait ? current : longest;
    });
    
    return calculateTimeInQueue(longestWaitItem.createdAt);
  };

  // ✅ ADD: Calculate average wait
  const calculateAverageWait = (waitingQueue: QueueItem[]): string => {
    if (waitingQueue.length === 0) return '0m';
    
    const totalWaitMinutes = waitingQueue.reduce((total, item) => {
      const waitMinutes = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60));
      return total + waitMinutes;
    }, 0);
    
    const avgMinutes = Math.floor(totalWaitMinutes / waitingQueue.length);
    return avgMinutes < 60 ? `${avgMinutes}m` : `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`;
  };

  // ✅ ENHANCED: Call next patient with better error handling
  const handleCallNext = async () => {
    try {
      const nextPatient = queueItems.find(item => item.status === 'waiting');
      
      if (!nextPatient) {
        alert('No patients waiting in queue');
        return;
      }
      
      const confirmMessage = `Call next patient?\n\nPatient: ${nextPatient.patient?.name || 'Unknown'}\nQueue #: ${nextPatient.queueNumber}\nPriority: ${nextPatient.priority.toUpperCase()}`;
      
      if (!confirm(confirmMessage)) return;
      
      await queueAPI.callNext();
      
      alert(`📢 CALLING: ${nextPatient.patient?.name || 'Patient'}\nQueue Number: #${nextPatient.queueNumber}\n\nPatient has been notified!`);
      
      fetchAllData();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error calling next patient:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to call next patient';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // ✅ ENHANCED: Update patient status with proper typing
  const handleStatusUpdate = async (id: number, newStatus: StatusLevel) => {
    try {
      const patient = queueItems.find(item => item.id === id);
      const confirmMessage = `Update patient status?\n\nPatient: ${patient?.patient?.name || 'Unknown'}\nNew Status: ${newStatus.replace('-', ' ').toUpperCase()}`;
      
      if (!confirm(confirmMessage)) return;
      
      await queueAPI.updateStatus(id, newStatus);
      
      alert(`✅ Status updated to: ${newStatus.replace('-', ' ').toUpperCase()}`);
      fetchAllData();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error updating status:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to update status';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // ✅ FIXED: Type-safe add patient to queue
  const handleAddToQueue = async () => {
    try {
      if (!selectedPatient) {
        alert('Please select a patient');
        return;
      }

      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      
      // ✅ FIXED: Proper typing for queue data
      const queueData: {
        patientId: number;
        priority: PriorityLevel;
        notes?: string;
      } = {
        patientId: parseInt(selectedPatient),
        priority: selectedPriority // ✅ FIXED: Now properly typed
      };

      await queueAPI.create(queueData);
      
      alert(`✅ Patient added to queue!\n\nPatient: ${patient?.name}\nPriority: ${selectedPriority.toUpperCase()}`);
      
      setShowAddToQueue(false);
      setSelectedPatient('');
      setSelectedPriority('normal');
      fetchAllData();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error adding to queue:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to add patient to queue';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // ✅ FIXED: Type-safe emergency patient handling
  const handleEmergencyAdd = async () => {
    try {
      if (!selectedPatient) {
        alert('Please select a patient for emergency');
        return;
      }

      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      
      // ✅ FIXED: Proper typing for emergency data
      const emergencyData: {
        patientId: number;
        priority: PriorityLevel;
      } = {
        patientId: parseInt(selectedPatient),
        priority: 'emergency' as PriorityLevel // ✅ FIXED: Explicit type assertion
      };

      // Try emergency endpoint first, fallback to regular create
      try {
        await queueAPI.emergency(emergencyData);
      } catch (emergencyError) {
        console.log('Emergency endpoint not available, using regular queue creation');
        await queueAPI.create(emergencyData);
      }
      
      alert(`🚨 EMERGENCY PATIENT ADDED!\n\nPatient: ${patient?.name}\nPriority: HIGHEST\n\nMoved to front of queue!`);
      
      setShowEmergencyModal(false);
      setSelectedPatient('');
      fetchAllData();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error adding emergency patient:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to add emergency patient';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // ✅ ADD: Priority color mapping with proper typing
  const getPriorityColor = (priority: PriorityLevel): "destructive" | "default" | "secondary" | "outline" => {
    switch (priority) {
      case 'emergency': return 'destructive';
      case 'urgent': return 'default';
      case 'normal': return 'secondary';
      default: return 'outline';
    }
  };

  // ✅ ADD: Priority display text with proper typing
  const getPriorityText = (priority: PriorityLevel): string => {
    switch (priority) {
      case 'emergency': return '🚨 Emergency';
      case 'urgent': return '⚠️ Urgent';
      case 'normal': return '📋 Normal';
      default: return '📋 Normal';
    }
  };

  // ✅ ADD: Status color mapping with proper typing
  const getStatusColor = (status: StatusLevel): string => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'with-doctor': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ ADD: Filter queue items with proper typing
  const filteredQueueItems = queueItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient?.phone?.includes(searchQuery) ||
      item.queueNumber?.toString().includes(searchQuery);
    
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // ✅ UPDATE: useEffect to recalculate stats when queue changes
  useEffect(() => {
    if (queueItems.length > 0) {
      fetchQueueStats();
    }
  }, [queueItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading queue management...</p>
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
              <h1 className="text-xl font-semibold text-gray-900">Queue Management System</h1>
            </div>
            <div className="flex space-x-2">
              <Dialog open={showAddToQueue} onOpenChange={setShowAddToQueue}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                    ➕ Add to Queue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Patient to Queue</DialogTitle>
                    <DialogDescription>Select a patient and set priority level</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Patient</label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              #{patient.id} - {patient.name} ({patient.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Priority Level</label>
                      {/* ✅ FIXED: Type-safe priority selection */}
                      <Select 
                        value={selectedPriority} 
                        onValueChange={(value: PriorityLevel) => setSelectedPriority(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">📋 Normal Priority</SelectItem>
                          <SelectItem value="urgent">⚠️ Urgent Priority</SelectItem>
                          <SelectItem value="emergency">🚨 Emergency Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddToQueue} className="w-full">
                      Add to Queue
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700">
                    🚨 Emergency Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">🚨 Emergency Patient</DialogTitle>
                    <DialogDescription>Add patient with highest priority (moves to front of queue)</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Emergency Patient</label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose emergency patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              #{patient.id} - {patient.name} ({patient.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">
                        ⚠️ This patient will be moved to the front of the queue with highest priority.
                      </p>
                    </div>
                    <Button onClick={handleEmergencyAdd} className="w-full bg-red-600 hover:bg-red-700">
                      🚨 Add Emergency Patient
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={handleCallNext} className="bg-blue-600 hover:bg-blue-700">
                📢 Call Next Patient
              </Button>
              <Button variant="outline" onClick={fetchAllData}>
                🔄 Refresh Queue
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{queueStats?.totalWaiting || 0}</div>
                <p className="text-sm text-gray-600">Total Waiting</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{queueStats?.emergencyCases || 0}</div>
                <p className="text-sm text-gray-600">🚨 Emergency</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{queueStats?.urgentCases || 0}</div>
                <p className="text-sm text-gray-600">⚠️ Urgent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{queueStats?.longestWait || '0m'}</div>
                <p className="text-sm text-gray-600">Longest Wait</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{queueStats?.averageWaitTime || '0m'}</div>
                <p className="text-sm text-gray-600">Average Wait</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">Search Patients</label>
                  <Input
                    placeholder="Search by name, phone, or queue number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter by Priority</label>
                  {/* ✅ FIXED: Type-safe filter selection */}
                  <Select 
                    value={filterPriority} 
                    onValueChange={(value: 'all' | PriorityLevel) => setFilterPriority(value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency</SelectItem>
                      <SelectItem value="urgent">⚠️ Urgent</SelectItem>
                      <SelectItem value="normal">📋 Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter by Status</label>
                  {/* ✅ FIXED: Type-safe status filter */}
                  <Select 
                    value={filterStatus} 
                    onValueChange={(value: 'all' | StatusLevel) => setFilterStatus(value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="with-doctor">With Doctor</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Patient Alert */}
          {queueStats?.nextPatient && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">📢 Next Patient to Call:</h3>
                    <p className="text-blue-800">
                      <span className="font-bold">#{queueStats.nextPatient.queueNumber}</span> - 
                      {queueStats.nextPatient.patient?.name || 'Unknown Patient'} 
                      ({queueStats.nextPatient.patient?.phone})
                    </p>
                    <p className="text-sm text-blue-700">
                      Priority: {getPriorityText(queueStats.nextPatient.priority)} • 
                      Waiting: {calculateTimeInQueue(queueStats.nextPatient.createdAt)}
                    </p>
                  </div>
                  <Button onClick={handleCallNext} className="bg-blue-600 hover:bg-blue-700">
                    📢 Call Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Patient Queue ({filteredQueueItems.length} patients)</span>
                <div className="text-sm font-normal text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredQueueItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No patients in queue</p>
                  <p className="text-gray-400 mt-2">Add patients to the queue to get started</p>
                  <Button 
                    onClick={() => setShowAddToQueue(true)} 
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    ➕ Add First Patient to Queue
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Queue #</TableHead>
                        <TableHead className="font-bold">Patient Details</TableHead>
                        <TableHead className="font-bold">Priority</TableHead>
                        <TableHead className="font-bold">Time in Queue</TableHead>
                        <TableHead className="font-bold">Est. Wait</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="font-bold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueueItems.map((item, index) => (
                        <TableRow 
                          key={item.id}
                          className={
                            item.priority === 'emergency' ? 'bg-red-50 border-red-100' :
                            item.priority === 'urgent' ? 'bg-yellow-50 border-yellow-100' :
                            index === 0 && item.status === 'waiting' ? 'bg-blue-50 border-blue-100' : ''
                          }
                        >
                          <TableCell className="font-mono font-bold text-lg">
                            #{item.queueNumber || (index + 1)}
                            {index === 0 && item.status === 'waiting' && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">NEXT</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-gray-900">
                                {item.patient?.name || 'Unknown Patient'}
                              </p>
                              <p className="text-sm text-gray-600">
                                📞 {item.patient?.phone || 'No phone'}
                              </p>
                              {item.patient?.age && (
                                <p className="text-xs text-gray-500">
                                  Age: {item.patient.age} • {item.patient?.gender || 'N/A'}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(item.priority)} className="font-medium">
                              {getPriorityText(item.priority)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.timeInQueue || calculateTimeInQueue(item.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-blue-600">
                            {item.estimatedWaitTime || calculateEstimatedWait(item.priority, index)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 justify-center">
                              {item.status === 'waiting' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleStatusUpdate(item.id, 'with-doctor')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  👨‍⚕️ With Doctor
                                </Button>
                              )}
                              {item.status === 'with-doctor' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(item.id, 'completed')}
                                  className="border-green-200 text-green-700 hover:bg-green-50"
                                >
                                  ✅ Complete
                                </Button>
                              )}
                              {item.status === 'completed' && (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  Completed
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
