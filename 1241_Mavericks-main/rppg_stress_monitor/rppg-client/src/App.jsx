import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import History from './pages/History';
import Reports from './pages/Reports';
import ModelInsights from './pages/ModelInsights';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/live" element={<LiveMonitoring />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/insights" element={<ModelInsights />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}