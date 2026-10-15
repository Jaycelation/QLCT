import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Finora — Tài chính cá nhân',description:'Quản lý thu chi, ngân sách và mục tiêu tiết kiệm trong một không gian riêng tư.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
