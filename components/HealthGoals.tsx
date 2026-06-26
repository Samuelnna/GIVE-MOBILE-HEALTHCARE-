import React from 'react';
import type { HealthGoal } from '../types';
import { mockHealthGoals } from '../data/healthGoals';
import { CheckCircleIcon } from './IconComponents';

const HealthGoalCard: React.FC<{ goal: HealthGoal }> = ({ goal }) => {
  const percentage = Math.min(100, (goal.currentProgress / goal.target) * 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-slate-50/50 p-4 rounded-lg flex items-center gap-4 transition-colors hover:bg-slate-100">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-full h-full" viewBox="0 0 70 70">
          <circle className="text-slate-200" cx="35" cy="35" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent" />
          <circle className="text-sky-500" cx="35" cy="35" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 35 35)"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sky-600">
          <goal.icon className="h-7 w-7" />
        </div>
      </div>
      <div className="overflow-hidden">
        <h4 className="font-bold text-slate-800 truncate">{goal.title}</h4>
        <p className="text-sm text-slate-500 truncate">{goal.description}</p>
        <p className="text-sm font-semibold mt-1">
          <span className="text-slate-800">{goal.currentProgress.toLocaleString()}</span> / {goal.target.toLocaleString()} {goal.unit}
        </p>
      </div>
    </div>
  );
};


const HealthGoals: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-teal-500" />
                Your Health Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockHealthGoals.map(goal => (
                    <HealthGoalCard key={goal.id} goal={goal} />
                ))}
            </div>
        </div>
    );
};

export default HealthGoals;