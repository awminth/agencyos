import type { Request, Response } from 'express';
import * as studentService from '../services/studentService.js';

export async function list(req: Request, res: Response): Promise<void> {
  const students = await studentService.listStudents({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    visaType: typeof req.query.visaType === 'string' ? req.query.visaType : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    expiringDays:
      typeof req.query.expiringDays === 'string' ? req.query.expiringDays : undefined,
  });
  res.json(students);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const student = await studentService.getStudentById(req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  res.json(student);
}

export async function create(req: Request, res: Response): Promise<void> {
  const student = await studentService.createStudent(req.body);
  res.status(201).json(student);
}

export async function update(req: Request, res: Response): Promise<void> {
  const student = await studentService.updateStudent(req.params.id, req.body);
  res.json(student);
}

export async function getRelated(req: Request, res: Response): Promise<void> {
  const related = await studentService.getStudentRelated(req.params.id);
  res.json(related);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await studentService.deleteStudent(req.params.id);
  res.json({
    success: true,
    message: 'Student deleted successfully',
    deletedInvoices: result.deletedInvoices,
  });
}
