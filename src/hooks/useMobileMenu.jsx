import { createContext, useContext, useState } from 'react';

export const MobileMenuContext = createContext(null);

export const useMobileMenu = () => useContext(MobileMenuContext);