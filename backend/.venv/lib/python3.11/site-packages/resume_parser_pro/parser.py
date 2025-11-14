# resume_parser/parser.py

import logging
from typing import Dict, Any

from .reader import ResumeReader
from .extractors.basic_fields import BasicFieldExtractor
from .extractors.experience import ExperienceExtractor
from .extractors.skills import SkillsExtractor
from .extractors.education import EducationExtractor


class ResumeParser:
    """
    A production-level Resume Parser that orchestrates reading,
    basic field extraction, experience extraction, skills, etc.
    """

    def __init__(self, resume_path: str, logger: logging.Logger = None):
        self.resume_path = resume_path
        self.logger = logger or logging.getLogger(__name__)

        # Instantiate sub-components
        self.reader = ResumeReader(logger=self.logger)
        self.basic_extractor = BasicFieldExtractor(logger=self.logger)
        self.experience_extractor = ExperienceExtractor(logger=self.logger)
        self.skills_extractor = SkillsExtractor(logger=self.logger)
        self.edu_extractor = EducationExtractor(logger=self.logger)

    def parse(self) -> Dict[str, Any]:
        """
        Parse the resume and return a dictionary of extracted fields.
        """
        self.logger.info(f"Parsing resume: {self.resume_path}")
        text = self.reader.read_resume_file(self.resume_path)

        # Extract fields
        name = self.basic_extractor.extract_name(text)
        emails = self.basic_extractor.extract_email(text)
        phones = self.basic_extractor.extract_phone_number(text)
        addresses = self.basic_extractor.extract_address(text)

        experiences = self.experience_extractor.extract_experience(text)
        skills = self.skills_extractor.extract_skills(text)
        education = self.edu_extractor.extract_education(text)

        return {
            "name": name,
            "email": emails,
            "phone_number": phones,
            "address": addresses,
            "experience": experiences,
            "skills": skills,
            "education": education,
        }


if __name__ == "__main__":
    # Example usage
    resume_path = "Kumar.Abhinav.docx"
    parser = ResumeParser(resume_path)
    parsed_data = parser.parse()
    print(parsed_data)
