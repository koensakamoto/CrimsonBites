import React, { useState } from 'react';
import { AccountSection } from './AccountSection';
import { AccountManagementSection } from './AccountManagementSection';

export default function UserAccount(props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Account Settings
          </h1>
          <p className="text-gray-600 mt-1.5 lg:mt-2 text-sm lg:text-base">
            Manage your profile, security, and privacy preferences
          </p>
        </div>

        {/* Content - Two Column Layout on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <AccountSection />
          </div>

          {/* Management Section - Takes up 1 column */}
          <div className="lg:col-span-1">
            <AccountManagementSection />
          </div>
        </div>
      </div>
    </div>
  );
}
