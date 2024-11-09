import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppDispatch, set_active_course } from '@/store/main';
import axios from 'axios';

const UV_CourseOverview: React.FC = () => {
  const { course_uid } = useParams<{ course_uid: string }>();
  const dispatch: AppDispatch = useDispatch();
  const auth = useSelector((state: AppState) => state.auth);
  const isTeacher = auth.user?.user_type === 'teacher';

  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseData();
  }, [course_uid]);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseRes, modulesRes, announcementsRes, assignmentsRes, progressRes] = await Promise.all([
        axios.get(`http://localhost:1337/courses/${course_uid}`, { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`http://localhost:1337/courses/${course_uid}/modules`, { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`http://localhost:1337/courses/${course_uid}/announcements`, { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`http://localhost:1337/courses/${course_uid}/assignments`, { headers: { Authorization: `Bearer ${auth.token}` } }),
        !isTeacher ? axios.get(`http://localhost:1337/students/${auth.user?.uid}/progress?course_uid=${course_uid}`, { headers: { Authorization: `Bearer ${auth.token}` } }) : null
      ]);

      setCourseDetails(courseRes.data);
      setModules(modulesRes.data);
      setAnnouncements(announcementsRes.data);
      setUpcomingAssignments(assignmentsRes.data);
      if (progressRes) {
        setUserProgress(progressRes.data);
      }

      dispatch(set_active_course({
        uid: courseRes.data.uid,
        name: courseRes.data.name,
        description: courseRes.data.description
      }));
    } catch (err) {
      setError('Failed to fetch course data. Please try again later.');
      console.error('Error fetching course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleExpansion = (moduleUid: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleUid) 
        ? prev.filter(uid => uid !== moduleUid)
        : [...prev, moduleUid]
    );
  };

  const navigateToContent = (contentUid: string) => {
    // Implementation depends on how content is displayed (new page, modal, etc.)
    console.log(`Navigating to content: ${contentUid}`);
  };

  const createAnnouncement = async (title: string, content: string) => {
    try {
      const response = await axios.post(`http://localhost:1337/courses/${course_uid}/announcements`, 
        { title, content },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setAnnouncements(prev => [response.data, ...prev]);
    } catch (err) {
      console.error('Error creating announcement:', err);
      // Handle error (e.g., show error message to user)
    }
  };

  const updateCourseProgress = async (contentUid: string, status: 'completed' | 'in_progress') => {
    try {
      await axios.put(`http://localhost:1337/courses/${course_uid}/progress`, 
        { content_item_uid: contentUid, status },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      // Update local state to reflect the change
      setUserProgress(prev => ({
        ...prev,
        completedModules: status === 'completed' ? prev.completedModules + 1 : prev.completedModules,
        overallProgress: (prev.completedModules + 1) / prev.totalModules * 100
      }));
    } catch (err) {
      console.error('Error updating course progress:', err);
      // Handle error (e.g., show error message to user)
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{courseDetails.name}</h1>
      <p className="text-gray-600 mb-8">{courseDetails.description}</p>

      {!isTeacher && userProgress && (
        <div className="bg-blue-100 p-4 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-2">Your Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${userProgress.overallProgress}%` }}></div>
          </div>
          <p className="mt-2">
            {userProgress.completedModules} of {userProgress.totalModules} modules completed
          </p>
        </div>
      )}

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Announcements</h2>
        {isTeacher && (
          <button
            onClick={() => {
              const title = prompt('Enter announcement title:');
              const content = prompt('Enter announcement content:');
              if (title && content) {
                createAnnouncement(title, content);
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600 transition"
          >
            Create Announcement
          </button>
        )}
        {announcements.length > 0 ? (
          <ul className="space-y-4">
            {announcements.map(announcement => (
              <li key={announcement.uid} className="bg-gray-100 p-4 rounded">
                <h3 className="font-semibold">{announcement.title}</h3>
                <p className="text-sm text-gray-600">{new Date(announcement.created_at).toLocaleDateString()}</p>
                <p className="mt-2">{announcement.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No announcements yet.</p>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Course Content</h2>
        {modules.map(module => (
          <div key={module.uid} className="mb-4">
            <button
              onClick={() => toggleModuleExpansion(module.uid)}
              className="flex justify-between items-center w-full bg-gray-200 p-4 rounded"
            >
              <span className="font-semibold">{module.name}</span>
              <span>{expandedModules.includes(module.uid) ? '▲' : '▼'}</span>
            </button>
            {expandedModules.includes(module.uid) && (
              <ul className="mt-2 space-y-2">
                {module.contentItems.map((item: any) => (
                  <li key={item.uid} className="flex items-center">
                    <button
                      onClick={() => navigateToContent(item.uid)}
                      className={`flex-grow p-2 rounded ${
                        item.status === 'completed' ? 'bg-green-100' :
                        item.status === 'available' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}
                    >
                      {item.title}
                    </button>
                    {!isTeacher && item.status === 'available' && (
                      <button
                        onClick={() => updateCourseProgress(item.uid, 'completed')}
                        className="ml-2 bg-green-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Mark Complete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Upcoming Assignments</h2>
        {upcomingAssignments.length > 0 ? (
          <ul className="space-y-4">
            {upcomingAssignments.map(assignment => (
              <li key={assignment.uid} className="bg-yellow-100 p-4 rounded">
                <h3 className="font-semibold">{assignment.title}</h3>
                <p className="text-sm text-gray-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                {!isTeacher && (
                  <Link
                    to={`/assignments/${assignment.uid}/submit`}
                    className="mt-2 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Submit Assignment
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming assignments.</p>
        )}
      </section>

      {isTeacher && (
        <section className="flex space-x-4">
          <Link
            to={`/courses/${course_uid}/content/upload`}
            className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 transition"
          >
            Upload Content
          </Link>
          <Link
            to={`/courses/${course_uid}/assignments/create`}
            className="bg-purple-500 text-white px-6 py-3 rounded hover:bg-purple-600 transition"
          >
            Create Assignment
          </Link>
        </section>
      )}
    </div>
  );
};

export default UV_CourseOverview;