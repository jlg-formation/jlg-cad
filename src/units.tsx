import {createContext} from 'react';
import type {LengthUnit} from './drafting';
export const UnitContext=createContext<LengthUnit>('mm');
