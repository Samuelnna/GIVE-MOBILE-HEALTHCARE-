import type { Conversation, ChatMessage } from '../types';
import { mockDoctors } from './doctors';

export const mockConversations: Conversation[] = [
    { id: 1, participant: { name: mockDoctors[0].name, imageUrl: mockDoctors[0].imageUrl }, lastMessage: "See you at 10:30 AM tomorrow!", timestamp: "1d ago", unreadCount: 0 },
    { id: 2, participant: { name: mockDoctors[1].name, imageUrl: mockDoctors[1].imageUrl }, lastMessage: "Your test results are available.", timestamp: "2d ago", unreadCount: 1 },
    { id: 3, participant: { name: mockDoctors[2].name, imageUrl: mockDoctors[2].imageUrl }, lastMessage: "Please remember to take the medication.", timestamp: "4d ago", unreadCount: 0 },
    { id: 4, participant: { name: mockDoctors[4].name, imageUrl: mockDoctors[4].imageUrl }, lastMessage: "We have an opening next Tuesday.", timestamp: "5d ago", unreadCount: 0 },
    { id: 5, participant: { name: mockDoctors[5].name, imageUrl: mockDoctors[5].imageUrl }, lastMessage: "Thank you for sending the documents.", timestamp: "1w ago", unreadCount: 2 },
];

export const mockMessages: { [key: number]: ChatMessage[] } = {
    1: [{ role: 'model', text: "Hello! Just a reminder about your video call appointment tomorrow at 10:30 AM." }, { role: 'user', text: "Thanks for the reminder! I'll be there." }, { role: 'model', text: "See you at 10:30 AM tomorrow!" }],
    2: [{ role: 'model', text: "Your test results are available. You can view them in the Lab Tests section." }, { role: 'user', text: "Great, I'll take a look." }],
    3: [{ role: 'model', text: "Please remember to take the medication as prescribed." }],
    4: [{ role: 'model', text: "We have an opening next Tuesday if you would like to reschedule." }],
    5: [{ role: 'model', text: "Got it, thanks!"}, { role: 'user', text: "You're welcome."}, { role: 'model', text: "Thank you for sending the documents." }]
};
