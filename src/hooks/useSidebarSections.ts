import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sidebar-sections-state';

const DEFAULT_SECTIONS: Record<string, boolean> = {
  reports: true,
  mediaPlans: true,
  draftPlans: false,
  activePlans: true,
  finishedPlans: false,
  mediaResources: false,
  resourcesDraftPlans: false,
  resourcesActivePlans: false,
  resourcesFinishedPlans: false,
  taxonomy: false,
  taxonomyDraftPlans: false,
  taxonomyActivePlans: false,
  taxonomyFinishedPlans: false,
  clients: false,
  subdivisions: false,
  moments: false,
  funnelStages: false,
  mediums: false,
  vehicles: false,
  targets: false,
  segments: false,
  targetsList: false,
  creatives: false,
  formatsList: false,
  creativeTypesList: false,
  statuses: false,
  trash: false,
  // Footer settings section
  settingsFooter: false,
  adminSubmenu: false,
  // Library config sections
  objectives: false,
  kpis: false,
  detailTypes: false,
};

export function useSidebarSections() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SECTIONS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error reading sidebar sections from localStorage:', e);
    }
    return DEFAULT_SECTIONS;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
    } catch (e) {
      console.error('Error saving sidebar sections to localStorage:', e);
    }
  }, [openSections]);

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setSection = useCallback((key: string, value: boolean) => {
    setOpenSections(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    openSections,
    toggleSection,
    setSection,
  };
}

// For vehicle/subdivision/format subsections
const VEHICLES_STORAGE_KEY = 'sidebar-vehicles-state';
const SUBDIVISIONS_STORAGE_KEY = 'sidebar-subdivisions-state';
const FORMATS_STORAGE_KEY = 'sidebar-formats-state';

export function useSidebarSubsections() {
  const [openVehicles, setOpenVehicles] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(VEHICLES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [openSubdivisions, setOpenSubdivisions] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(SUBDIVISIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [openFormats, setOpenFormats] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(FORMATS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(openVehicles));
    } catch {}
  }, [openVehicles]);

  useEffect(() => {
    try {
      localStorage.setItem(SUBDIVISIONS_STORAGE_KEY, JSON.stringify(openSubdivisions));
    } catch {}
  }, [openSubdivisions]);

  useEffect(() => {
    try {
      localStorage.setItem(FORMATS_STORAGE_KEY, JSON.stringify(openFormats));
    } catch {}
  }, [openFormats]);

  return {
    openVehicles,
    setOpenVehicles,
    openSubdivisions,
    setOpenSubdivisions,
    openFormats,
    setOpenFormats,
  };
}
