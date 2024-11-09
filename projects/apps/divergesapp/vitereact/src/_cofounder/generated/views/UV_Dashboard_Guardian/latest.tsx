import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AppState, AppDispatch, fetchNotificationsThunk } from '@/store/main';

const UV_Dashboard_Guardian: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const auth = useSelector((state: AppState) => state.auth);
  const notifications = useSelector((state: AppState) => state.notifications);

  const [associatedStudents, setAssociatedStudents] = useState<Array<{
    uid: string;
    name: string;
    grade: number;
    avatar: string;
  }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<{
    uid: string;
    name: string;
    grade: number;
    avatar: string;
  } | null>(null);
  const [studentProgress, setStudentProgress] = useState<{
    overallGrade: number;
    courseProgress: Array<{
      courseId: string;
      courseName: string;
      progress: number;
      grade: number;
    }>;
    recentAssignments: Array<{
      id: string;
      title: string;
      courseName: string;
      dueDate: string;
      status: 'completed' | 'pending' | 'overdue';
    }>;
  }>({
    overallGrade: 0,
    courseProgress: [],
    recentAssignments: [],
  });
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    id: string;
    title: string;
    date: string;
    type: 'conference' | 'deadline' | 'other';
  }>>([]);
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string;
    teacherName: string;
    subject: string;
    preview: string;
    date: string;
    isRead: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const associatedStudentsResponse = await axios.get(`http://localhost:1337/api/guardians/${auth.user?.uid}/associated-students`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setAssociatedStudents(associatedStudentsResponse.data);
      if (associatedStudentsResponse.data.length > 0) {
        setSelectedStudent(associatedStudentsResponse.data[0]);
        await fetchStudentData(associatedStudentsResponse.data[0].uid);
      }

      const eventsResponse = await axios.get(`http://localhost:1337/api/guardians/${auth.user?.uid}/upcoming-events`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setUpcomingEvents(eventsResponse.data);

      const messagesResponse = await axios.get(`http://localhost:1337/api/guardians/${auth.user?.uid}/recent-messages`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setRecentMessages(messagesResponse.data);

      dispatch(fetchNotificationsThunk());
    } catch (err) {
      setError('Failed to fetch dashboard data. Please try again later.');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentData = async (studentUid: string) => {
    try {
      const progressResponse = await axios.get(`http://localhost:1337/api/students/${studentUid}/progress`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setStudentProgress(progressResponse.data);
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Failed to fetch student data. Please try again later.');
    }
  };

  const handleStudentSelect = async (student: typeof selectedStudent) => {
    setSelectedStudent(student);
    if (student) {
      await fetchStudentData(student.uid);
    }
  };

  const handleRespondToMessage = (messageId: string) => {
    // Implement message response logic here
    console.log('Responding to message:', messageId);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Guardian Dashboard</h1>
        
        {isLoading ? (
          <div className="text-center">
            <p className="text-xl">Loading dashboard data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Associated Students</h2>
                <div className="flex flex-wrap gap-4">
                  {associatedStudents.map((student) => (
                    <button
                      key={student.uid}
                      onClick={() => handleStudentSelect(student)}
                      className={`flex items-center p-2 rounded-lg ${
                        selectedStudent?.uid === student.uid ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'
                      }`}
                    >
                      <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full mr-2" />
                      <div className="text-left">
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-sm text-gray-600">Grade {student.grade}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedStudent && (
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-semibold mb-4">
                    {selectedStudent.name}'s Progress
                  </h2>
                  <div className="mb-4">
                    <p className="text-lg">Overall Grade: <span className="font-bold">{studentProgress.overallGrade.toFixed(1)}%</span></p>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Course Progress</h3>
                  <div className="space-y-4">
                    {studentProgress.courseProgress.map((course) => (
                      <div key={course.courseId} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{course.courseName}</p>
                          <p className="text-sm text-gray-600">Grade: {course.grade.toFixed(1)}%</p>
                        </div>
                        <div className="w-1/2">
                          <div className="bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-right mt-1">{course.progress}% Complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Recent Assignments</h2>
                <div className="space-y-4">
                  {studentProgress.recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-gray-600">{assignment.courseName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        event.type === 'conference' ? 'bg-purple-500' :
                        event.type === 'deadline' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Recent Messages</h2>
                <div className="space-y-4">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="border-b pb-2">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium">{message.teacherName}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          message.isRead ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {message.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{message.subject}</p>
                      <p className="text-sm text-gray-600 truncate">{message.preview}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{new Date(message.date).toLocaleString()}</p>
                        <button
                          onClick={() => handleRespondToMessage(message.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Respond
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/messages" className="block text-center mt-4 text-blue-600 hover:text-blue-800">
                  View All Messages
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Dashboard_Guardian;