'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTasksForUser, toggleTaskCompletion, addTask, deleteTask, updateTask, Task } from '@/lib/firestoreService';
import styles from './Checklist.module.css';
import AIAssistant from '@/components/AIAssistant';

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskText, setNewTaskText] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [showAI, setShowAI] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    useEffect(() => {
        if (user?.uid) {
            fetchTasks();
        }
    }, [user?.uid]);

    const fetchTasks = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const fetchedTasks = await getTasksForUser(user.uid);
            setTasks(fetchedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim() || !user?.uid) return;

        setIsAdding(true);
        try {
            const newTaskObject = {
                text: newTaskText,
                assignedTo: user.uid,
                createdBy: user.uid,
                isCompleted: false
            };
            const id = await addTask(newTaskObject);
            // Optimistic update
            const newTask: Task = { ...newTaskObject, id, createdAt: Date.now() };
            setTasks(prev => [newTask, ...prev]);
            setNewTaskText('');
        } catch (error) {
            console.error('Error adding task:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggle = async (taskId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, isCompleted: !currentStatus } : t
            ));

            await toggleTaskCompletion(taskId, !currentStatus);
        } catch (error) {
            console.error('Error toggling task:', error);
            // Revert on error
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, isCompleted: currentStatus } : t
            ));
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المهمة؟')) return;

        try {
            // Optimistic update
            setTasks(prev => prev.filter(t => t.id !== taskId));
            await deleteTask(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            fetchTasks(); // Revert by refetching
        }
    };

    const startEditing = (task: Task) => {
        setEditingId(task.id);
        setEditingText(task.text);
    };

    const saveEdit = async () => {
        if (!editingId || !editingText.trim()) return;

        try {
            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === editingId ? { ...t, text: editingText } : t
            ));

            await updateTask(editingId, editingText);
            setEditingId(null);
            setEditingText('');
        } catch (error) {
            console.error('Error updating task:', error);
            fetchTasks();
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingText('');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">جاري تحميل المهام...</div>;
    }

    return (
        <div className={styles.checklistContainer}>
            <div className={styles.notepad}>
                <div className={styles.listWrapper}>
                    <div className={styles.listHeader}>
                        <div className="flex justify-between items-center w-full">
                            <h1>مهامي (To-Do List)</h1>
                            <button
                                onClick={() => setShowAI(true)}
                                className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform animate-pulse flex items-center gap-1 text-sm font-bold"
                            >
                                <span>✨</span> AI
                            </button>
                        </div>
                    </div>

                    {showAI && (
                        <AIAssistant
                            onClose={() => setShowAI(false)}
                            context={{ tasks }}
                            pageTitle="مساعد إدارة المهام"
                            suggestions={[
                                { label: 'تحديد أولويات', prompt: 'راجع قائمة المهام وحدد أهم 3 مهام يجب إنجازها اليوم.', icon: '⚡' },
                                { label: 'تنظيم الوقت', prompt: 'اقترح جدولاً زمنياً لتنفيذ هذه المهام خلال اليوم.', icon: '📅' }
                            ]}
                        />
                    )}

                    <form onSubmit={handleAddTask} className={styles.addTaskContainer}>
                        <input
                            type="text"
                            className={styles.taskInput}
                            placeholder="أضف مهمة جديدة..."
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            disabled={isAdding}
                        />
                        <button
                            type="submit"
                            className={styles.addButton}
                            disabled={isAdding || !newTaskText.trim()}
                        >
                            {isAdding ? '...' : '+'}
                        </button>
                    </form>

                    <div className={styles.listItems}>
                        {tasks.length === 0 ? (
                            <div className="text-center text-gray-500 py-10 font-bold text-xl font-amiri">
                                لا توجد مهام جديدة حالياً 🎉
                            </div>
                        ) : (
                            tasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`${styles.liItem} ${task.isCompleted ? styles.strikedItem : ''}`}
                                >
                                    {editingId === task.id ? (
                                        <div className="flex w-full gap-2 items-center">
                                            <input
                                                type="text"
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                className="flex-1 p-2 border rounded-md"
                                                autoFocus
                                            />
                                            <button onClick={saveEdit} className="text-green-600 hover:text-green-800">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </button>
                                            <button onClick={cancelEdit} className="text-red-600 hover:text-red-800">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                <input
                                                    type="checkbox"
                                                    className={styles.listCb}
                                                    checked={task.isCompleted}
                                                    onChange={() => handleToggle(task.id, task.isCompleted)}
                                                />
                                                <span className="truncate" title={task.text}>{task.text}</span>
                                            </div>

                                            <div className="flex gap-2 mr-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditing(task)}
                                                    className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                    title="تعديل"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                    title="حذف"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
