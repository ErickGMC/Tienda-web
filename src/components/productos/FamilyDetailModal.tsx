'use client';

import React from 'react';
import FamilyDetailDrawer from './FamilyDetailDrawer';
import { Producto } from '@/types/producto';

interface FamilyDetailModalProps {
  familia: Producto | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilyDetailModal({ familia, isOpen, onClose }: FamilyDetailModalProps) {
  return <FamilyDetailDrawer familia={familia} isOpen={isOpen} onClose={onClose} />;
}

