import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppDispatch, connectWebSocketThunk, fetchNotificationsThunk } from '@/store/main';

import GV_TopNavigation from '@/components/views/GV_TopNavigation';
import GV_Footer from '@/components/views/GV_Footer';
import GV_Notifications from '@/components/views/GV_Notifications';
import UV_Landing from '@/components/views/UV_Landing';
import UV_Login from '@/components/views/UV_Login';
import UV_Registration from '@/components/views/UV_Registration';
import UV_Dashboard_Teacher from '@/components/views/UV_Dashboard_Teacher';
import UV_Dashboard_Student from '@/components/views/UV_Dashboard_Student';
import UV_Dashboard_Guardian from '@/components/views/UV_Dashboard_Guardian';
import UV_CourseCreation from '@/components/views/UV_CourseCreation';
import UV_CourseOverview from '@/components/views/UV_CourseOverview';
import UV_ContentUpload from '@/components/views/UV_ContentUpload';
import UV_AssignmentCreation from '@/components/views/UV_AssignmentCreation';
import UV_AssignmentSubmission from '@/components/views/UV_AssignmentSubmission';
import UV_GradingInterface from '@/components/views/UV_GradingInterface';
import UV_StudentProgress from '@/components/views/UV_StudentProgress';
import UV_MessagingCenter from '@/components/views/UV_MessagingCenter';
import UV_VideoConference from '@/components/views/UV_VideoConference';

const App: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const isAuthenticated = useSelector((state: AppState) => state.auth.is_authenticated);
  const userType = useSelector((state: AppState) => state.auth.user?.user_type);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(connectWebSocketThunk());
      dispatch(fetchNotificationsThunk());
    }
  }, [isAuthenticated, dispatch]);

  const getDashboardComponent = () => {
    switch (userType) {
      case 'teacher':
        return <UV_Dashboard_Teacher />;
      case 'student':
        return <UV_Dashboard_Student />;
      case 'guardian':
        return <UV_Dashboard_Guardian />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {isAuthenticated && <GV_TopNavigation />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <UV_Landing />} />
            <Route path="/login" element={<UV_Login />} />
            <Route path="/register" element={<UV_Registration />} />
            <Route
              path="/dashboard"
              element={isAuthenticated ? getDashboardComponent() : <Navigate to="/login" />}
            />
            <Route
              path="/courses"
              element={isAuthenticated ? <UV_CourseOverview /> : <Navigate to="/login" />}
            />
            <Route
              path="/courses/create"
              element={isAuthenticated && userType === 'teacher' ? <UV_CourseCreation /> : <Navigate to="/login" />}
            />
            <Route
              path="/courses/:course_uid"
              element={isAuthenticated ? <UV_CourseOverview /> : <Navigate to="/login" />}
            />
            <Route
              path="/courses/:course_uid/content/upload"
              element={isAuthenticated && userType === 'teacher' ? <UV_ContentUpload /> : <Navigate to="/login" />}
            />
            <Route
              path="/courses/:course_uid/assignments/create"
              element={isAuthenticated && userType === 'teacher' ? <UV_AssignmentCreation /> : <Navigate to="/login" />}
            />
            <Route
              path="/assignments/:assignment_uid/submit"
              element={isAuthenticated && userType === 'student' ? <UV_AssignmentSubmission /> : <Navigate to="/login" />}
            />
            <Route
              path="/assignments/:assignment_uid/grade"
              element={isAuthenticated && userType === 'teacher' ? <UV_GradingInterface /> : <Navigate to="/login" />}
            />
            <Route
              path="/students/:student_uid/progress"
              element={isAuthenticated ? <UV_StudentProgress /> : <Navigate to="/login" />}
            />
            <Route
              path="/messages"
              element={isAuthenticated ? <UV_MessagingCenter /> : <Navigate to="/login" />}
            />
            <Route
              path="/video-conference/:meeting_id"
              element={isAuthenticated ? <UV_VideoConference /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
        <GV_Footer />
        {isAuthenticated && <GV_Notifications />}
      </div>
    </Router>
  );
};

export default App;