import { createContext, useContext } from 'react';

export const TourInterceptContext = createContext<{
  shouldIntercept: (index: number) => boolean;
}>({ shouldIntercept: () => false });

export const useTourIntercept = () => useContext(TourInterceptContext);
