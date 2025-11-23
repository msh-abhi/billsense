import React from 'react';
import { ClientLayout } from './ClientLayout';

export const ClientSupport: React.FC = () => {
    return (
        <ClientLayout>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Support</h2>
                <p className="text-gray-600">
                    Need help? Contact your project manager or support team.
                </p>
                <div className="mt-6">
                    <a
                        href="mailto:support@example.com"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        </ClientLayout>
    );
};
