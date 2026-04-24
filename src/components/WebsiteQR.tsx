'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer, Download, Globe } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

export default function WebsiteQR() {
  const printRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  
  // URL to encode - pointing to main website
  const websiteUrl = origin

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const canvas = printContent.querySelector('canvas')
    if (!canvas) return
    
    const qrDataUrl = canvas.toDataURL('image/png')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Fixy Stays - Business Card</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              text-align: center;
              padding: 20px;
              background-color: white;
              box-sizing: border-box;
            }
            .container {
              border: 12px solid #2563eb;
              padding: 50px 40px;
              border-radius: 50px;
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 90%;
              max-width: 650px;
              box-sizing: border-box;
              background: linear-gradient(to bottom, #ffffff, #f0f7ff);
            }
            .logo-text {
              font-size: 56px;
              font-weight: 900;
              color: #2563eb;
              margin-bottom: 5px;
              letter-spacing: -2px;
            }
            .tagline {
              font-size: 22px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 40px;
              max-width: 500px;
              line-height: 1.3;
              font-style: italic;
            }
            .qr-wrapper {
              background: white;
              padding: 30px;
              border-radius: 30px;
              box-shadow: 0 20px 50px rgba(37, 99, 235, 0.1);
              margin-bottom: 40px;
              border: 2px solid #e5e7eb;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              color: #2563eb;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .website-url {
              font-size: 24px;
              color: #1f2937;
              font-weight: 700;
              margin-bottom: 30px;
            }
            .footer {
              margin-top: 40px;
              font-size: 16px;
              color: #4b5563;
              font-weight: 600;
              letter-spacing: 1px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="/logo.png" style="width: 100px; height: 100px; margin-bottom: 20px;" />
            <div class="logo-text">Fixy Stays</div>
            <div class="tagline">Alibag's premier hotel booking and data management software.</div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" style="width: 350px; height: 350px;" />
            </div>
            <div class="instruction">Visit us at</div>
            <div class="website-url">www.fixystays.com</div>
            <div class="footer">STAY SMART • MANAGE BETTER</div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!origin) return null

  return (
    <div className="bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center gap-8 w-full max-w-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110"></div>
      
      <div className="flex items-center justify-between w-full border-b border-gray-100 pb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-100">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 tracking-tight">Website QR</h3>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Marketing Asset</p>
          </div>
        </div>
      </div>
      
      <div 
        ref={printRef} 
        className="p-6 bg-white rounded-[2rem] border-2 border-blue-100 shadow-xl flex items-center justify-center relative z-10"
      >
        <QRCodeCanvas
          value={websiteUrl}
          size={200}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: "/logo.png",
            x: undefined,
            y: undefined,
            height: 48,
            width: 48,
            excavate: true,
          }}
        />
      </div>

      <div className="text-center space-y-2 relative z-10">
        <p className="text-lg font-black text-gray-900 italic tracking-tight">FixyStays.com</p>
        <p className="text-[11px] text-gray-500 font-bold leading-relaxed px-4">
          Alibag's premier hotel booking and data management software.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full relative z-10">
        <Button 
          className="h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 rounded-2xl"
          onClick={handlePrint}
        >
          <Printer className="w-5 h-5 mr-3" /> Print Marketing Card
        </Button>
        <Button 
          variant="ghost" 
          className="h-10 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={() => {
            const canvas = printRef.current?.querySelector('canvas')
            if (canvas) {
              const url = canvas.toDataURL('image/png')
              const link = document.createElement('a')
              link.href = url
              link.download = `fixystays-website-qr.png`
              link.click()
            }
          }}
        >
          <Download className="w-3.5 h-3.5 mr-2 opacity-50" /> Download Raw Image
        </Button>
      </div>
    </div>
  )
}
