import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockROIReport } from '../lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FileText, Mail, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Report() {
  const { id } = useParams();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // In a real app, fetch report data using ID
  // const report = await api.get(`/reports/${id}`)
  const report = mockROIReport;

  const handleSendCertificates = () => {
    setIsSending(true);
    // Simulate API Call: await api.post('/certificates/send', { bookingId: id })
    setTimeout(() => {
      setIsSending(false);
      setSent(true);
    }, 1500);
  };

  if (!report || report.bookingId !== id) {
    // Fallback for demo
    report.bookingId = id || 'unknown';
  }

  const isOvercrowded = report.efficiency > 100;

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Top Actions (Hidden when printing) */}
        <div className="flex justify-between items-center mb-8 no-print">
          <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </Link>
          
          <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2">
            <FileText className="w-4 h-4" /> Print PDF
          </button>
        </div>

        {/* The Report Card */}
        <div className="glass-card print-card overflow-hidden">
          
          {/* Header */}
          <div className="bg-navy-800 border-b border-white/5 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{report.sessionTitle}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                  ROI Report
                </span>
              </div>
              <p className="text-gray-400 flex items-center gap-2">
                {report.roomName} • {report.timeRange}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Session ID</div>
              <div className="font-mono text-gray-300">{report.bookingId}</div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-navy-900/50 p-6 rounded-xl border border-white/5">
                <div className="text-sm text-gray-400 mb-2">Expected Attendance</div>
                <div className="text-3xl font-bold text-white">{report.expectedAttendance}</div>
              </div>
              
              <div className="bg-navy-900/50 p-6 rounded-xl border border-white/5">
                <div className="text-sm text-gray-400 mb-2">Actual Peak Attendance</div>
                <div className="text-3xl font-bold text-white">{report.actualAttendance}</div>
              </div>

              <div className={`bg-navy-900/50 p-6 rounded-xl border ${isOvercrowded ? 'border-amber-500/30' : 'border-white/5'}`}>
                <div className="text-sm text-gray-400 mb-2 flex items-center justify-between">
                  Capacity Efficiency
                  {isOvercrowded && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className={`text-3xl font-bold ${isOvercrowded ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {report.efficiency}%
                </div>
                {isOvercrowded && (
                  <div className="text-xs text-amber-500/80 mt-1">Room was over capacity</div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="mb-12">
              <h3 className="text-lg font-semibold text-white mb-6">Occupancy Timeline</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.timeline} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <ReferenceLine y={report.expectedAttendance} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Expected', fill: '#f59e0b', fontSize: 12 }} />
                    <Bar 
                      dataKey="count" 
                      name="Headcount" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
              <div className="text-sm text-gray-400">
                Attendance verified by physical vision system. Ready for certificate generation.
              </div>
              
              <button
                onClick={handleSendCertificates}
                disabled={isSending || sent}
                className={`btn-primary flex items-center gap-2 whitespace-nowrap ${sent ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
              >
                {isSending ? (
                  <>Sending...</>
                ) : sent ? (
                  <><CheckCircle2 className="w-4 h-4" /> Certificates Sent</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send Certificates</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

