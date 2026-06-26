import type { Activity } from '../types';
import { CalendarIcon, MessageIcon, LabIcon, PharmacyIcon, PencilSquareIcon } from '../components/IconComponents';

export const mockActivityFeed: Activity[] = [
    {
        id: 1,
        type: 'appointment',
        description: 'You scheduled a video call with Dr. Emily Carter.',
        timestamp: '1 day ago',
        icon: CalendarIcon,
    },
    {
        id: 2,
        type: 'message',
        description: 'You received a new message from Dr. Ben Adams.',
        timestamp: '2 days ago',
        icon: MessageIcon,
    },
    {
        id: 3,
        type: 'lab',
        description: 'Your results for the "Lipid Panel" are available.',
        timestamp: '4 days ago',
        icon: LabIcon,
    },
    {
        id: 4,
        type: 'pharmacy',
        description: 'Your order including "Ibuprofen" has been processed.',
        timestamp: '5 days ago',
        icon: PharmacyIcon,
    },
     {
        id: 5,
        type: 'notes',
        description: 'You added consultation notes for your appointment with Dr. Sophia Williams.',
        timestamp: '1 week ago',
        icon: PencilSquareIcon,
    },
    {
        id: 6,
        type: 'appointment',
        description: 'Your appointment with Dr. Olivia Chen was completed.',
        timestamp: '2 weeks ago',
        icon: CalendarIcon,
    },
];
