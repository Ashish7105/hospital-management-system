// app/doctors/page.tsx - COMPLETE FIXED VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doctorAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ✅ ADD ERROR TYPE INTERFACE
interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      details?: string;
    };
  };
  message?: string;
}

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  experience: string;
  availability: string;
  gender?: string;
  location?: string;
}

export default function DoctorsManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showEditDoctor, setShowEditDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
    experience: '',
    availability: 'Available',
    gender: '',
    location: ''
  });
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getAll();
      const doctorData = response.data?.data || response.data || [];
      setDoctors(doctorData);
      console.log('Doctors loaded:', doctorData);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error fetching doctors:', error);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    try {
      if (!newDoctor.name || !newDoctor.specialization || !newDoctor.phone) {
        alert('Name, specialization, and phone are required');
        return;
      }

      const doctorData = {
        ...newDoctor,
        gender: newDoctor.gender || 'Not Specified',
        location: newDoctor.location || 'Not Specified',
        isActive: true
      };

      console.log('Adding doctor:', doctorData);
      await doctorAPI.create(doctorData);
      
      alert('Doctor added successfully!');
      setShowAddDoctor(false);
      setNewDoctor({
        name: '',
        specialization: '',
        phone: '',
        email: '',
        experience: '',
        availability: 'Available',
        gender: '',
        location: ''
      });
      fetchDoctors();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error creating doctor:', error);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          error.message ||
                          'Failed to create doctor';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleEditDoctor = async () => {
    try {
      if (!editingDoctor) return;

      console.log('Updating doctor:', editingDoctor);
      await doctorAPI.update(editingDoctor.id, editingDoctor);
      
      alert('Doctor updated successfully!');
      setShowEditDoctor(false);
      setEditingDoctor(null);
      fetchDoctors();
    } catch (err) {
      const error = err as ApiError;
      console.error('Error updating doctor:', error);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          error.message ||
                          'Failed to update doctor';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleScheduleDoctor = (doctor: Doctor) => {
    alert(`Schedule management for Dr. ${doctor.name} - Feature coming soon!\n\nThis would open a calendar interface to manage the doctor's availability and appointment slots.`);
  };

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor({ ...doctor });
    setShowEditDoctor(true);
  };

  const getSpecializationColor = (specialization: string) => {
    const colors = {
      'cardiology': 'bg-red-100 text-red-800',
      'neurology': 'bg-purple-100 text-purple-800',
      'orthopedic': 'bg-blue-100 text-blue-800',
      'pediatrics': 'bg-green-100 text-green-800',
      'general': 'bg-gray-100 text-gray-800',
      'dentistry': 'bg-yellow-100 text-yellow-800',
      'dermatology': 'bg-pink-100 text-pink-800',
    };
    return colors[specialization?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading doctors...</p>
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
                ← Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Doctor Management</h1>
            </div>
            <div className="flex space-x-2">
              <Dialog open={showAddDoctor} onOpenChange={setShowAddDoctor}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    👨‍⚕️ Add Doctor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Doctor</DialogTitle>
                    <DialogDescription>Enter the doctor's information.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Doctor Name"
                      value={newDoctor.name}
                      onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                    />
                    <Select value={newDoctor.specialization} onValueChange={(value) => setNewDoctor({...newDoctor, specialization: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiology">Cardiology</SelectItem>
                        <SelectItem value="neurology">Neurology</SelectItem>
                        <SelectItem value="orthopedic">Orthopedic</SelectItem>
                        <SelectItem value="pediatrics">Pediatrics</SelectItem>
                        <SelectItem value="general">General Medicine</SelectItem>
                        <SelectItem value="dentistry">Dentistry</SelectItem>
                        <SelectItem value="dermatology">Dermatology</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Phone Number"
                      value={newDoctor.phone}
                      onChange={(e) => setNewDoctor({...newDoctor, phone: e.target.value})}
                    />
                    <Input
                      placeholder="Email (Optional)"
                      value={newDoctor.email}
                      onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                    />
                    <Input
                      placeholder="Years of Experience"
                      value={newDoctor.experience}
                      onChange={(e) => setNewDoctor({...newDoctor, experience: e.target.value})}
                    />
                    
                    <Select value={newDoctor.gender} onValueChange={(value) => setNewDoctor({...newDoctor, gender: value})}>
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

                    {/* ✅ ADDED: Missing Location Input Field */}
                    <Input
                      placeholder="Location (e.g., Room 201, Building A)"
                      value={newDoctor.location}
                      onChange={(e) => setNewDoctor({...newDoctor, location: e.target.value})}
                    />
                    
                    <Button onClick={handleAddDoctor} className="w-full">
                      Add Doctor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={fetchDoctors}>
                🔄 Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {doctors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No doctors registered</p>
                <p className="text-gray-400 mt-2">Add your first doctor to get started</p>
                <Button 
                  onClick={() => setShowAddDoctor(true)} 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                >
                  👨‍⚕️ Add First Doctor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {doctor.name?.charAt(0) || 'D'}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{doctor.name || 'Unknown Doctor'}</CardTitle>
                        <Badge variant="outline" className={getSpecializationColor(doctor.specialization)}>
                          {doctor.specialization || 'General'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {doctor.phone || 'Phone not provided'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        {doctor.email || 'Email not provided'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Experience: {doctor.experience || 'Not specified'}
                      </div>
                      
                      {/* ✅ ENHANCED: Show location and gender in doctor cards */}
                      {doctor.location && doctor.location !== 'Not Specified' && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Location: {doctor.location}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openEditModal(doctor)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleScheduleDoctor(doctor)}
                      >
                        Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Doctor Modal */}
      <Dialog open={showEditDoctor} onOpenChange={setShowEditDoctor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>Update the doctor's information.</DialogDescription>
          </DialogHeader>
          {editingDoctor && (
            <div className="space-y-4">
              <Input
                placeholder="Doctor Name"
                value={editingDoctor.name}
                onChange={(e) => setEditingDoctor({...editingDoctor, name: e.target.value})}
              />
              <Select value={editingDoctor.specialization} onValueChange={(value) => setEditingDoctor({...editingDoctor, specialization: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="orthopedic">Orthopedic</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="general">General Medicine</SelectItem>
                  <SelectItem value="dentistry">Dentistry</SelectItem>
                  <SelectItem value="dermatology">Dermatology</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Phone Number"
                value={editingDoctor.phone}
                onChange={(e) => setEditingDoctor({...editingDoctor, phone: e.target.value})}
              />
              <Input
                placeholder="Email"
                value={editingDoctor.email}
                onChange={(e) => setEditingDoctor({...editingDoctor, email: e.target.value})}
              />
              <Input
                placeholder="Years of Experience"
                value={editingDoctor.experience}
                onChange={(e) => setEditingDoctor({...editingDoctor, experience: e.target.value})}
              />
              
              <Select value={editingDoctor.gender || ''} onValueChange={(value) => setEditingDoctor({...editingDoctor, gender: value})}>
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

              {/* ✅ ADDED: Missing Location Input Field in Edit Modal */}
              <Input
                placeholder="Location (e.g., Room 201, Building A)"
                value={editingDoctor.location || ''}
                onChange={(e) => setEditingDoctor({...editingDoctor, location: e.target.value})}
              />
              
              <Button onClick={handleEditDoctor} className="w-full">
                Update Doctor
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
