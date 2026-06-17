import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import UserGuideTour from './components/UserGuideTour'
import Home from './pages/Home'
import StakeholderDirectory from './pages/StakeholderDirectory'
import ProjectStocktaking from './pages/ProjectStocktaking'
import KnowledgeMap from './pages/KnowledgeMap'
import ResourceLibrary from './pages/ResourceLibrary'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import SDGs from './pages/SDGs'
import ProjectDetails from './pages/ProjectDetails'
import SearchResults from './pages/SearchResults'
import AdminDashboard from './pages/AdminDashboard'
import MyProjects from './pages/MyProjects'
import ChatBot from './components/ChatBot'
import { AuthProvider, useAuth } from './context/AuthContext'

function AdminRoute({ children }) {
  const { isAdmin, isLoggedIn } = useAuth()
  if (!isLoggedIn || !isAdmin) return <Navigate to="/" replace />
  return children
}

function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const dir = i18n.dir()
    document.documentElement.dir = dir
    document.documentElement.lang = i18n.language
    document.title = i18n.t('app.title')
  }, [i18n, i18n.language])

  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 160px)', paddingTop: '72px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stakeholders" element={<StakeholderDirectory />} />
            <Route path="/projects" element={<ProjectStocktaking />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/map" element={<KnowledgeMap />} />
            <Route path="/resources" element={<ResourceLibrary />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/sdgs" element={<SDGs />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Routes>
        </main>
        <ChatBot />
        <Footer />
        <UserGuideTour />
        <ToastContainer position="bottom-right" theme="light" />
      </div>
    </AuthProvider>
  )
}

export default App
