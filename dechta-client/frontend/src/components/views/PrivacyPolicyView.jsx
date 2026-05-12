import React, { useEffect, useState } from 'react';
import { Shield, Lock, Eye, ArrowLeft, Mail, ChevronRight, FileText, Globe, UserCheck, Bell, Scale } from 'lucide-react';

const PrivacyPolicyView = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState(0);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const sections = [
    {
      id: "collection",
      title: "Information We Collect",
      icon: <Eye className="w-5 h-5 text-cyan-500" />,
      content: [
        "We collect personal information such as your name, phone number, and delivery address to facilitate service bookings and hardware orders.",
        "When you use our 'Hire Workers' feature, we may collect your real-time location data to connect you with the nearest expert professionals.",
        "We also collect device information (IP address, browser type) to improve platform security and performance."
      ]
    },
    {
      id: "usage",
      title: "How We Use Your Data",
      icon: <UserCheck className="w-5 h-5 text-cyan-500" />,
      content: [
        "To process and fulfill your orders for hardware and professional services.",
        "To provide customer support and resolve any disputes or technical issues.",
        "To personalize your experience and show you relevant local service providers.",
        "To communicate important updates regarding our services or your account."
      ]
    },
    {
      id: "sharing",
      title: "Sharing with Third Parties",
      icon: <Globe className="w-5 h-5 text-cyan-500" />,
      content: [
        "We share necessary details with registered vendors and service workers to complete your requested tasks.",
        "We use trusted payment processors like Razorpay to handle transactions securely.",
        "We do not sell, rent, or trade your personal data with third-party advertisers.",
        "Legal disclosures may occur if required by law or to protect our rights and property."
      ]
    },
    {
      id: "security",
      title: "Data Security Measures",
      icon: <Lock className="w-5 h-5 text-cyan-500" />,
      content: [
        "All data transmissions are protected by 256-bit SSL encryption.",
        "Our databases are stored in secure cloud environments with strict access controls.",
        "We conduct regular security audits to identify and mitigate potential vulnerabilities.",
        "Sensitive information like passwords is never stored in plain text."
      ]
    },
    {
      id: "rights",
      title: "Your Privacy Rights",
      icon: <Scale className="w-5 h-5 text-cyan-500" />,
      content: [
        "You have the right to access the personal data we hold about you.",
        "You can request corrections to inaccurate data through your profile settings.",
        "You may request the deletion of your account and associated personal information.",
        "You can opt-out of non-essential communications at any time."
      ]
    },
    {
      id: "updates",
      title: "Policy Updates",
      icon: <Bell className="w-5 h-5 text-cyan-500" />,
      content: [
        "We may update this policy periodically to reflect changes in our practices or for legal reasons.",
        "Significant changes will be notified via the platform or email.",
        "Continued use of Dechta after updates constitutes acceptance of the new terms."
      ]
    }
  ];

  const scrollToSection = (index) => {
    setActiveSection(index);
    const element = document.getElementById(sections[index].id);
    if (element) {
      const offset = 120; // Account for sticky header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] transition-colors duration-300 font-sans">
      {/* Minimalist Fresh Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-[#020617] border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/dechta.png" className="h-10 md:h-12 w-auto object-contain" alt="Dechta Brand" />
            <div className="w-[1px] h-6 bg-gray-200 dark:bg-slate-700 hidden md:block" />
            <span className="font-black italic text-lg md:text-xl tracking-tighter text-gray-950 dark:text-white uppercase hidden md:block">Privacy</span>
          </div>

          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-all bg-gray-50 dark:bg-slate-900 px-6 py-3 rounded-full border border-gray-100 dark:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Shop
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Sidebar / TOC */}
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-32 space-y-8">
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 leading-none italic uppercase tracking-tighter">
                  Privacy <br/>
                  <span className="text-cyan-500">Policy.</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                  How Dechta protects your personal data and ensures a safe building experience.
                </p>
              </div>

              <nav className="space-y-1">
                {sections.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(idx)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all duration-300 ${
                      activeSection === idx 
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <span className="text-sm font-black uppercase tracking-tight italic">{s.title}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${activeSection === idx ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </nav>

              <div className="p-6 bg-gray-50 dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
                <Mail className="w-6 h-6 text-cyan-500 mb-3" />
                <h4 className="text-sm font-black uppercase italic text-gray-900 dark:text-white mb-2">Need Help?</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-bold leading-relaxed mb-4">
                  Our privacy team is available for any questions or data requests.
                </p>
                <a 
                  href="mailto:privacy@dechta.com" 
                  className="text-xs font-black text-cyan-600 dark:text-cyan-400 hover:underline transition-all"
                >
                  privacy@dechta.com
                </a>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl space-y-20 pb-40">
            {sections.map((section, idx) => (
              <section 
                key={section.id} 
                id={section.id} 
                className="scroll-mt-32 group"
                onMouseEnter={() => setActiveSection(idx)}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-lg border border-gray-100 dark:border-slate-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">
                    {idx + 1}. {section.title}
                  </h2>
                </div>

                <div className="space-y-6">
                  {section.content.map((p, pIdx) => (
                    <div key={pIdx} className="flex gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                      <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                        {p}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Footer Note */}
            <div className="pt-20 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-1 bg-cyan-500" />
                <span className="text-sm font-black uppercase italic tracking-widest text-gray-400">Legal Statement</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-500 font-bold leading-relaxed">
                By using Dechta, you agree to the collection and use of information in accordance with this policy. 
                We are committed to maintaining the trust of our users and ensuring that your data remains private 
                and secure throughout your building and renovation journey.
              </p>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;

