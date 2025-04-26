{/* WHEREVER YOU PUT THIS, MAKE SURE IT IS ACTUALLY COMPLIANT - AND CHECK THE LIST OF STUFF BC IT'S PROBABLY INCOMPLETE */}
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function WcagComplianceInfo() {
  const [showWcagInfo, setShowWcagInfo] = useState(false)

  return (
    <div className="relative">
      <button 
        onClick={() => setShowWcagInfo(!showWcagInfo)}
        className="text-xs px-3 py-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition-colors"
        aria-expanded={showWcagInfo}
        aria-controls="wcag-info"
      >
        WCAG Compliance Info
      </button>
      
      {showWcagInfo && (
        <Card id="wcag-info" className="mt-2 shadow-sm border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-slate-800">WCAG Compliance Information</CardTitle>
            <CardDescription className="pb-2 text-slate-500">
              Web Content Accessibility Guidelines compliance details
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <p>This visualization is designed to comply with WCAG 2.1 Level AA standards, ensuring accessibility for users with disabilities.</p>
              <h3 className="font-medium text-slate-800">Compliance Features:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Proper color contrast ratios for text and interactive elements</li>
                <li>Keyboard navigation support throughout the interface</li>
                <li>Responsive design that supports text resizing up to 200%</li>
              </ul>
              
              <p>For more information about our accessibility features or to report accessibility issues, please contact our support team.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}