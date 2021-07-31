import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { debounceTime } from 'rxjs/operators';

import firebase from 'firebase/app';
import 'firebase/firestore';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);



@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  public canvasHumidity: any;                             
  public ctxHumidity: any;                                
  public chartHumidity: any;                             

  public humiditySensorReading: any;                      // form input
  public temperatureSensorReading: any;
  
  public historicalHumidity: any[];                       

  public currentSensorReadings: any;                    


  constructor(private firestore: AngularFirestore) {
    this.historicalHumidity = [];
}


  ngOnInit(): void {
    this.initHumidityChart();

    let docNameCurrent = 'current';                                                                                
    let docNameHistoric = this.buildHistoricDocName();                                                              

    this.currentSensorReadings = this.firestore.collection('gardenPlants').doc(docNameCurrent).valueChanges();     
    this.firestore.collection('gardenPlants').doc(docNameCurrent).valueChanges().pipe(                              
        debounceTime(20)                                                                                           
    )
        .subscribe(data => {
            if (data && data.hasOwnProperty('humidity'))
                this.addDataToChart(this.chartHumidity, '', data['humidity']);  

        });

    console.log('docNameHistoric', docNameHistoric);
    this.firestore.collection('gardenPlants').doc(docNameHistoric).ref.get().then((doc) => {      
        if (doc.exists) {
            let data = doc.data();
            let measurements = data['historicalMeasurements'];

            console.log('measurements', measurements);

            for (let i = 0; i < measurements.length; i++) {
                let measurement = measurements[i];
                let humidity = measurement['humidity'];
                this.addDataToChart(this.chartHumidity, '', humidity);
            }
        }
    }).catch((error) => {
        console.log('Error getting historical doc:', error);
    });

    this.randomizeSensorReadings();                    
}

initHumidityChart() {
    this.canvasHumidity = document.getElementById('chartHumidity');
    this.ctxHumidity = this.canvasHumidity.getContext('2d');
    this.chartHumidity = new Chart(this.ctxHumidity, {
        type: 'line',
        data: {
          
            labels: [],
            datasets: [{
                label: 'Plant Humidity',
                data: [],
                fill: false,
                borderColor: 'rgb(51, 104, 255)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

randomizeSensorReadings() {
    this.humiditySensorReading = this.generateRandomInt(0, 100);
    this.temperatureSensorReading = this.generateRandomInt(60, 80);
}

generateRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}

insertData() {
    let docNameCurrent = 'current';                                             // only storing the current sensor readings
    let docNameHistoric = this.buildHistoricDocName();                          // storing an array of all sensor readings for the time bucket

    this.firestore.collection('gardenPlants').doc(docNameCurrent)
        .set({
            'humidity': this.humiditySensorReading,
            'temperature': this.temperatureSensorReading,
            'timestamp': firebase.firestore.Timestamp.now()
        });

    this.firestore.collection('gardenPlants').doc(docNameHistoric)
        .set({
            'historicalMeasurements': firebase.firestore.FieldValue.arrayUnion({
                'humidity': this.humiditySensorReading,
                'temperature': this.temperatureSensorReading,
                'timestamp': firebase.firestore.Timestamp.now()
            })
        },
            { merge: true });                              

    this.randomizeSensorReadings();                                             
}

buildHistoricDocName() {
    let now = new Date();

    let year = now.getFullYear();
    let month = (now.getMonth() + 1) + '';                                         
    let day = now.getDate() + '';
    let hour = now.getHours() + '';

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    if (hour.length < 2)
        hour = '0' + hour;
    hour = 'h' + hour;

    return [year, month, day, hour].join('_');             
}

addDataToChart(chart, label, data) {
    console.log('chart - ' + data);
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data);
    });
    chart.update();
}

}

  