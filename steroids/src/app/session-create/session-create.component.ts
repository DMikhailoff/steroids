import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import Exercice from 'src/model/Exercice';
import { PersistanceService } from '../persistance.service';
import Session from 'src/model/Session';
import { Router } from '@angular/router';

@Component({
  selector: 'app-session-create',
  templateUrl: './session-create.component.html',
  styleUrls: ['./session-create.component.css']
})
export class SessionCreateComponent implements OnInit {
  sessionForm : FormGroup;

  constructor(
    private fb: FormBuilder,
    private persistance: PersistanceService,
    private router: Router)
    {
      this.sessionForm = this.fb.group({
      name: ['', Validators.required ]
    });
  }

  ngOnInit() {
  }

  createSession(){
    const formModel = this.sessionForm.value;
    this.persistance.createSession(new Session(formModel.name));
    this.router.navigate(['/sessions']);
  }

}