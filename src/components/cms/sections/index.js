/**
 * CMS Section Editor registry.
 * Maps section types to their editor components.
 */
import HeroSectionEditor from './HeroSectionEditor'
import RichTextSectionEditor from './RichTextSectionEditor'
import CtaSectionEditor from './CtaSectionEditor'
import GallerySectionEditor from './GallerySectionEditor'
import TestimonialsSectionEditor from './TestimonialsSectionEditor'
import FaqSectionEditor from './FaqSectionEditor'
import FormSectionEditor from './FormSectionEditor'
import CustomSectionEditor from './CustomSectionEditor'

export const SECTION_EDITORS = {
  hero: HeroSectionEditor,
  richText: RichTextSectionEditor,
  cta: CtaSectionEditor,
  gallery: GallerySectionEditor,
  testimonials: TestimonialsSectionEditor,
  faq: FaqSectionEditor,
  form: FormSectionEditor,
  custom: CustomSectionEditor,
}

export {
  HeroSectionEditor,
  RichTextSectionEditor,
  CtaSectionEditor,
  GallerySectionEditor,
  TestimonialsSectionEditor,
  FaqSectionEditor,
  FormSectionEditor,
  CustomSectionEditor,
}
