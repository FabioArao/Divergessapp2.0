import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { AppState } from '@/store/main';

const UV_Landing: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const isAuthenticated = useSelector((state: AppState) => state.auth.is_authenticated);
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((section: string) => {
    setActiveSection(section);
    const sectionRef = {
      hero: heroRef,
      features: featuresRef,
      testimonials: testimonialsRef,
      faq: faqRef,
      cta: ctaRef
    }[section];

    sectionRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const toggleModal = useCallback(() => {
    setIsModalOpen(prev => !prev);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const submitContactForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await axios.post('http://localhost:1337/api/contact', formData);
      setFormData({ name: '', email: '', message: '' });
      toggleModal();
      // Show success message (you can implement a toast notification here)
    } catch (error) {
      setFormError('Failed to submit the form. Please try again.');
    }
  }, [formData, toggleModal]);

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  return (
    <>
      <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <nav className="container mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">DivergesiApp</div>
            <div className="hidden md:flex space-x-4">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-blue-600">Features</button>
              <button onClick={() => scrollToSection('testimonials')} className="text-gray-600 hover:text-blue-600">Testimonials</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-blue-600">FAQ</button>
              <Link to="/login" className="text-blue-600 hover:text-blue-800">Log In</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Sign Up</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        <section ref={heroRef} className="bg-blue-50 py-20">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">Welcome to DivergesiApp</h1>
            <p className="text-xl text-gray-600 mb-8">The ultimate platform for seamless communication between teachers, students, and guardians.</p>
            <div className="space-x-4">
              <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition duration-300">Get Started</Link>
              <button onClick={toggleModal} className="bg-white text-blue-600 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition duration-300">Contact Sales</button>
            </div>
          </div>
        </section>

        <section ref={featuresRef} className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Course Management</h3>
                <p className="text-gray-600">Easily create and manage courses, upload content, and track student progress.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Real-time Communication</h3>
                <p className="text-gray-600">Instant messaging and video conferencing for seamless interaction.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Progress Tracking</h3>
                <p className="text-gray-600">Comprehensive dashboards for monitoring student performance and engagement.</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={testimonialsRef} className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">What Our Users Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 mb-4">"DivergesiApp has revolutionized how I communicate with parents and manage my classroom."</p>
                <p className="font-semibold">- Sarah T., Teacher</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 mb-4">"I love how easy it is to keep track of my assignments and progress in all my courses."</p>
                <p className="font-semibold">- Alex C., Student</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 mb-4">"As a parent, I feel more connected to my child's education than ever before."</p>
                <p className="font-semibold">- Michael R., Guardian</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={faqRef} className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">How do I get started with DivergesiApp?</h3>
                <p className="text-gray-600">Simply sign up for an account, choose your role (teacher, student, or guardian), and follow the onboarding process.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">Is DivergesiApp suitable for all grade levels?</h3>
                <p className="text-gray-600">Yes, DivergesiApp is designed to accommodate all grade levels from elementary to higher education.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">How secure is the platform?</h3>
                <p className="text-gray-600">We prioritize data security and comply with all relevant education privacy laws and regulations.</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={ctaRef} className="bg-blue-600 py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your educational experience?</h2>
            <p className="text-xl text-blue-100 mb-8">Join thousands of teachers, students, and guardians already using DivergesiApp.</p>
            <Link to="/register" className="bg-white text-blue-600 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition duration-300">Sign Up Now</Link>
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Contact Sales</h2>
            <form onSubmit={submitContactForm}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="message" className="block text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  required
                ></textarea>
              </div>
              {formError && <p className="text-red-500 mb-4">{formError}</p>}
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={toggleModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Landing;