import React from 'react';
import { ClientLayout } from './ClientLayout';

export const ClientSettings: React.FC = () => {
    return (
        <ClientLayout>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                <p className="text-gray-600">
                    Account settings and preferences will be available here soon.
                </p>
            </div>
        </ClientLayout>
    );
};
