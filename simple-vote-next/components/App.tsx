'use client';

import React from 'react';
import { useWallet } from './WalletProvider';
import { Toast } from './Toast';

export function App() {
    const { account, isConnected, connect, disconnect, error, clearError } = useWallet();

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-center mb-8">SimpleVote</h1>

                <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                        >
                            ウォレット接続
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">接続済みアカウント</p>
                                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                                    {account}
                                </p>
                            </div>
                            <button
                                onClick={disconnect}
                                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
                            >
                                切断
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* エラーメッセージの表示 */}
            {error && <Toast message={error} type="error" onClose={clearError} />}
        </div>
    );
}
