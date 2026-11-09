import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './schemas/course.schema.js';

@Injectable()
export class CourseService {

  constructor(@InjectModel('Course') private courseModel: Model<Course>) {}

  async create(createCourseDto: CreateCourseDto) {
    return await this.courseModel.create(createCourseDto);
  }

  async findAll() {
    return await this.courseModel.find();
  }

  async findOne(id: string) {
    return await this.courseModel.findById(id);
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    return await this.courseModel.findByIdAndUpdate(id, updateCourseDto, { new: true });
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
