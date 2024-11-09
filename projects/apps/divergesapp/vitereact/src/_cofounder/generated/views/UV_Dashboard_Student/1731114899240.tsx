import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState, AppDispatch, fetchNotificationsThunk } from '@/store/main';
import axios from 'axios';

const UV_Dashboard_Student: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: AppState) => state.auth);
  const notifications = useSelector((state: AppState) => state.notifications.items);

  const [enrolledCourses, setEnrolledCourses] = useState<Array<{ id: string; name: string; progress: number }>>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Array<{ id: string; title: string; courseId: string; courseName: string; dueDate: string }>>([]);
  const [recentGrades, setRecentGrades] = useState<Array<{ id: string; title: string; courseId: string; courseName: string; score: number; maxScore: number }>>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; courseId: string; courseName: string; content: string; date: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyStreak, setStudyStreak] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    dispatch(fetchNotificationsThunk());
    // Set up WebSocket listener for real-time updates
    setupWebSocket();
  }, [dispatch]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesRes, assignmentsRes, gradesRes, announcementsRes] = await Promise.all([
        axios.get('/api/student/courses'),
        axios.get('/api/student/assignments'),
        axios.get('/api/student/grades'),
        axios.get('/api/student/announcements')
      ]);

      setEnrolledCourses(coursesRes.data);
      setUpcomingAssignments(assignmentsRes.data);
      setRecentGrades(gradesRes.data);
      setAnnouncements(announcementsRes.data);
      
      // Simulated study streak (replace with actual logic based on your requirements)
      setStudyStreak(Math.floor(Math.random() * 30));
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Assuming the WebSocket connection is already established in the main store
    // Add listeners for specific events related to the student dashboard
    if (window.socket) {
      window.socket.on('grade_update', handleGradeUpdate);
      window.socket.on('new_announcement', handleNewAnnouncement);
    }
  };

  const handleGradeUpdate = (newGrade: any) => {
    setRecentGrades(prevGrades => [newGrade, ...prevGrades.slice(0, 4)]);
  };

  const handleNewAnnouncement = (newAnnouncement: any) => {
    setAnnouncements(prevAnnouncements => [newAnnouncement, ...prevAnnouncements]);
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user?.full_name}!</h1>
      
      {isLoading ? (
        <div className="text-center">
          <p className="text-xl">Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Course Progress */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Course Progress</h2>
              {enrolledCourses.map(course => (
                <div key={course.id} className="mb-4">
                  <Link to={`/courses/${course.id}`} className="text-blue-600 hover:underline">{course.name}</Link>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${course.progress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{course.progress}% complete</p>
                </div>
              ))}
            </div>

            {/* Upcoming Assignments */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Upcoming Assignments</h2>
              {upcomingAssignments.map(assignment => (
                <div key={assignment.id} className="mb-4">
                  <Link to={`/assignments/${assignment.id}/submit`} className="text-blue-600 hover:underline">{assignment.title}</Link>
                  <p className="text-sm text-gray-600">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{assignment.courseName}</p>
                </div>
              ))}
            </div>

            {/* Recent Grades */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Recent Grades</h2>
              {recentGrades.map(grade => (
                <div key={grade.id} className="mb-4">
                  <p className="font-medium">{grade.title}</p>
                  <p className="text-sm text-gray-600">{grade.courseName}</p>
                  <p className="text-sm text-gray-800">Score: {grade.score}/{grade.maxScore}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Announcements</h2>
            {announcements.map(announcement => (
              <div key={announcement.id} className="mb-4 pb-4 border-b last:border-b-0">
                <p className="font-medium">{announcement.courseName}</p>
                <p className="text-sm text-gray-800">{announcement.content}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(announcement.date).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Study Streak */}
          <div className="mt-8 bg-yellow-100 p-4 rounded-lg">
            <p className="text-lg font-semibold">🔥 Your study streak: {studyStreak} days</p>
            <p className="text-sm text-gray-700">Keep it up to unlock achievements!</p>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Refresh Dashboard
            </button>
            <Link
              to="/courses"
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              View All Courses
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default UV_Dashboard_Student;