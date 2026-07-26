import React from 'react';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function DashboardSkeleton() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div><SkeletonLoader className="h-12 w-full rounded-md" /></div>
        <div><SkeletonLoader className="h-12 w-full rounded-md" /></div>
        <div><SkeletonLoader className="h-12 w-full rounded-md" /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><SkeletonLoader className="h-56 w-full rounded-md" /></div>
        <div><SkeletonLoader className="h-56 w-full rounded-md" /></div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><SkeletonLoader className="h-40 w-full rounded-md" /></div>
        <div><SkeletonLoader className="h-40 w-full rounded-md" /></div>
      </div>
    </div>
  );
}