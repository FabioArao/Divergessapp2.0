import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppState, AppDispatch, fetchNotificationsThunk } from '@/store/main';

const UV_Dashboard_Teacher: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state: AppState) => state.auth);
  const notifications = useSelector((state: AppState) => state.notifications);

  const [stats, setStats] = useState({ activeCourses: 0, pendingAssignments: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{ id: string; title: string; date: string; type: 'class' | 'event' }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; type: string; content: string; timestamp: number }>>([]);
  const [activeCourses, setActiveCourses] = useState<Array<{ id: string; name: string; studentCount: number; nextAssignmentDue: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsResponse, eventsResponse, activityResponse, coursesResponse] = await Promise.all([
        axios.get('/api/teacher/stats', { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get('/api/teacher/events', { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get('/api/teacher/activity', { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get('/api/teacher/courses', { headers: { Authorization: `Bearer ${auth.token}` } }),
      ]);

      setStats(statsResponse.data);
      setUpcomingEvents(eventsResponse.data);
      setRecentActivity(activityResponse.data);
      setActiveCourses(coursesResponse.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    }
  }, [auth.token]);

  useEffect(() => {
    fetchDashboardData();
    dispatch(fetchNotificationsThunk());
  }, [fetchDashboardData, dispatch]);

  const handleCreateCourseClick = () => {
    navigate('/courses/create');
  };

  const handleCreateAssignmentClick = () => {
    navigate('/courses/create');
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {auth.user?.full_name}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <p className="mb-2">Active Courses: {stats.activeCourses}</p>
          <p>Pending Assignments: {stats.pendingAssignments}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <ul>
            {upcomingEvents.map((event) => (
              <li key={event.id} className="mb-2">
                <span className="font-medium">{event.title}</span> - {event.date} ({event.type})
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <ul>
            {recentActivity.map((activity) => (
              <li key={activity.id} className="mb-2">
                <span className="font-medium">{activity.type}</span>: {activity.content}
                <br />
                <small className="text-gray-500">{new Date(activity.timestamp).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={handleCreateCourseClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Create New Course
        </button>
        <button
          onClick={handleCreateAssignmentClick}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          Create New Assignment
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Active Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.id)}
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-medium mb-2">{course.name}</h3>
              <p className="text-sm text-gray-600 mb-1">Students: {course.studentCount}</p>
              <p className="text-sm text-gray-600">Next Assignment Due: {course.nextAssignmentDue}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
        <ul className="bg-white shadow rounded-lg divide-y">
          {notifications.items.map((notification) => (
            <li key={notification.uid} className="p-4 hover:bg-gray-50">
              <p className={`mb-1 ${notification.is_read ? 'text-gray-600' : 'font-semibold'}`}>
                {notification.content}
              </p>
              <small className="text-gray-500">
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UV_Dashboard_Teacher;