import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Shell.module.css';

export default function Shell({ children }: { children: ReactNode }) {
    return (
        <div className={styles.shell}>
            <Sidebar />
            <Header />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
