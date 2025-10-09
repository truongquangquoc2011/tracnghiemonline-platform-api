import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common'

export const InvalidImageTypeException = new BadRequestException({
  message: 'Error.InvalidImageType',
  path: 'image',
})

export const ImageTooLargeException = new BadRequestException({
  message: 'Error.ImageTooLarge',
  path: 'image',
})

export const ImageBufferNotFoundException = new InternalServerErrorException({
  message: 'Error.ImageBufferNotFound',
  path: 'image',
})

export const AudioBufferNotFoundException = new InternalServerErrorException({
  message: 'Error.ImageBufferNotFound',
  path: 'audio',
})

export const UploadToCloudinaryFailedException = new InternalServerErrorException({
  message: 'Error.UploadToCloudinaryFailed',
  path: 'image',
})

export const UserNotFoundException = new BadRequestException({
  message: 'Error.UserNotFound',
  path: 'user',
})

export const NoFileProvidedException = new BadRequestException({
  message: 'Error.NoFileProvided',
  path: 'image',
})

export const CVNotFoundOrForbiddenException = new NotFoundException({
  message: 'Error.CVNotFoundOrForbidden',
  path: 'cv',
})

export const CVUpdateFailedException = new InternalServerErrorException({
  message: 'Error.CVUpdateFailed',
  path: 'cv',
})

export const CVPersonalInfoNotFoundException = new NotFoundException({
  message: 'Error.CVPersonalInfoNotFound',
  path: 'personalInfo',
})

export const CVPersonalInfoAlreadyExistsException = new ConflictException({
  message: 'Error.CVPersonalInfoAlreadyExists',
  path: 'personalInfo',
})

/// Work Experience
export const CVWorkExperienceCompanyNameRequiredException = new BadRequestException({
  message: 'Error.CV.WorkExperience.CompanyName.Required',
  path: 'companyName',
})

export const CVWorkExperienceJobTitleRequiredException = new BadRequestException({
  message: 'Error.CV.WorkExperience.JobTitle.Required',
  path: 'jobTitle',
})

export const CVWorkExperienceEmploymentTypeInvalidException = new BadRequestException({
  message: 'Error.CV.WorkExperience.EmploymentType.Invalid',
  path: 'employmentType',
})

export const CVWorkExperienceStartDateInvalidException = new BadRequestException({
  message: 'Error.CV.WorkExperience.StartDate.Invalid',
  path: 'startDate',
})

export const CVWorkExperienceWorkModeInvalidException = new BadRequestException({
  message: 'Error.CV.WorkExperience.WorkMode.Invalid',
  path: 'workMode',
})

export const CVWorkExperienceNotFoundException = new NotFoundException({
  message: 'Error.CV.WorkExperience.NotFound',
  path: 'workExperience',
})

export const CVWorkExperienceUpdateFailedException = new InternalServerErrorException({
  message: 'Error.CV.WorkExperience.UpdateFailed',
  path: 'workExperience',
})

export const CVWorkExperienceDeleteFailedException = new InternalServerErrorException({
  message: 'Error.CV.WorkExperience.DeleteFailed',
  path: 'workExperience',
})

/// Role
export const RoleNotFoundException = new NotFoundException({
  message: 'Error.Role.NotFound',
  path: 'role',
})

export const RoleAlreadyExistsException = new ConflictException({
  message: 'Error.Role.AlreadyExists',
  path: 'role',
})

export const RoleCreateFailedException = new InternalServerErrorException({
  message: 'Error.Role.CreateFailed',
  path: 'role',
})

export const RoleUpdateFailedException = new InternalServerErrorException({
  message: 'Error.Role.UpdateFailed',
  path: 'role',
})

export const RoleDeleteFailedException = new InternalServerErrorException({
  message: 'Error.Role.DeleteFailed',
  path: 'role',
})

export const RoleRestoreFailedException = new InternalServerErrorException({
  message: 'Error.Role.RestoreFailed',
  path: 'role',
})
