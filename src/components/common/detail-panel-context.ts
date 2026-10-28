'use client';

import { createContext } from 'react';

export const DetailPanelBackContext = createContext<(() => void) | null>(null);
