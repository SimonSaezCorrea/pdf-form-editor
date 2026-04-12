import '@/styles/tokens.css';
import '@/styles/reset.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('pdf-editor-theme');if(s==='dark'||s==='light'){document.documentElement.dataset.theme=s;}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
